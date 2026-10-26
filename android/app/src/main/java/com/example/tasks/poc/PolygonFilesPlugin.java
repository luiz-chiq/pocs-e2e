package com.example.tasks.poc;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.provider.OpenableColumns;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONException;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

/** Arquivos via SAF: o Android concede acesso só ao documento/pasta selecionado. */
@CapacitorPlugin(name = "PolygonFiles")
public class PolygonFilesPlugin extends Plugin {
    private final AtomicBoolean busy = new AtomicBoolean(false);
    private byte[] exportContent;
    private int exportCount;

    private boolean begin(PluginCall call) {
        if (busy.compareAndSet(false, true)) return true;
        call.resolve(new JSObject().put("status", "error").put("message", "Já existe uma operação de arquivo em andamento."));
        return false;
    }

    private void finish(PluginCall call, JSObject result) {
        exportContent = null;
        busy.set(false);
        if (call != null) call.resolve(result);
    }

    private void fail(PluginCall call, Exception error) {
        finish(call, new JSObject().put("status", "error").put("message", error instanceof JSONException ? error.getMessage() : "Não foi possível acessar o arquivo. Escolha outra pasta ou conceda o acesso solicitado."));
    }

    private void launch(PluginCall call, Intent intent, String callback) {
        getActivity().runOnUiThread(() -> {
            try { startActivityForResult(call, intent, callback); }
            catch (Exception error) { fail(call, error); }
        });
    }

    @PluginMethod
    public void importPolygons(PluginCall call) {
        if (!begin(call)) return;
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        // Alguns provedores identificam JSON como text/plain ou application/octet-stream.
        intent.setType("*/*");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        launch(call, intent, "importSelected");
    }

    @ActivityCallback
    private void importSelected(PluginCall call, ActivityResult result) {
        Intent data = result.getData();
        if (call == null || result.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null) {
            finish(call, new JSObject().put("status", "cancelled"));
            return;
        }
        Uri uri = data.getData();
        getBridge().execute(() -> {
            try {
                ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                try (InputStream stream = getContext().getContentResolver().openInputStream(uri)) {
                    if (stream == null) throw new java.io.IOException("Arquivo indisponível");
                    byte[] buffer = new byte[8192];
                    int read;
                    while ((read = stream.read(buffer)) != -1) {
                        if (bytes.size() + read > PolygonDocument.MAX_BYTES) throw new JSONException("Escolha um arquivo JSON de até 10 MB.");
                        bytes.write(buffer, 0, read);
                    }
                }
                String content = bytes.toString(StandardCharsets.UTF_8.name()).replaceFirst("^\\uFEFF", "");
                JSONObject parsed = PolygonDocument.parse(content);
                JSONObject document = PolygonDocument.validate(parsed);
                finish(call, new JSObject().put("status", "success").put("fileName", displayName(uri)).put("polygons", new JSArray(document.getJSONArray("polygons").toString())));
            } catch (Exception error) { fail(call, error); }
        });
    }

    @PluginMethod
    public void exportPolygons(PluginCall call) {
        if (!begin(call)) return;
        try {
            JSONObject document = PolygonDocument.validate(new JSONObject().put("format", "poligonos").put("version", 1).put("polygons", call.getArray("polygons")));
            exportContent = (document.toString(2) + "\n").getBytes(StandardCharsets.UTF_8);
            exportCount = document.getJSONArray("polygons").length();
            if (exportContent.length > PolygonDocument.MAX_BYTES) throw new JSONException("A exportação excede o limite de 10 MB.");
            // A confirmação "Permitir" do Android autoriza somente esta pasta.
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            launch(call, intent, "exportFolderSelected");
        } catch (Exception error) { fail(call, error); }
    }

    @ActivityCallback
    private void exportFolderSelected(PluginCall call, ActivityResult result) {
        Intent data = result.getData();
        if (call == null || result.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null) {
            finish(call, new JSObject().put("status", "cancelled"));
            return;
        }
        Uri tree = data.getData();
        byte[] content = exportContent;
        int count = exportCount;
        getBridge().execute(() -> {
            Uri file = null;
            try {
                if ((data.getFlags() & Intent.FLAG_GRANT_WRITE_URI_PERMISSION) == 0 || content == null) throw new SecurityException("Pasta sem acesso de escrita");
                Uri folder = DocumentsContract.buildDocumentUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree));
                // Um nome novo preserva arquivos anteriores e evita sobrescrita silenciosa.
                String name = "poligonos-" + UUID.randomUUID() + ".json";
                file = DocumentsContract.createDocument(getContext().getContentResolver(), folder, "application/json", name);
                if (file == null) throw new java.io.IOException("Não foi possível criar o arquivo");
                try (OutputStream stream = getContext().getContentResolver().openOutputStream(file, "wt")) {
                    if (stream == null) throw new java.io.IOException("Não foi possível abrir o arquivo");
                    stream.write(content);
                    stream.flush();
                }
                finish(call, new JSObject().put("status", "success").put("count", count).put("fileName", displayName(file)));
            } catch (Exception error) {
                if (file != null) {
                    try { DocumentsContract.deleteDocument(getContext().getContentResolver(), file); }
                    catch (Exception ignored) { /* Preservar o erro original. */ }
                }
                fail(call, error);
            }
        });
    }

    private String displayName(Uri uri) {
        try (Cursor cursor = getContext().getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) return cursor.getString(0);
        } catch (Exception ignored) { }
        return "poligonos.json";
    }
}
