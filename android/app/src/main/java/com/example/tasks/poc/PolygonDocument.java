package com.example.tasks.poc;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.text.Normalizer;
import java.util.HashSet;
import java.util.Set;
import android.util.JsonReader;
import android.util.JsonToken;
import java.io.StringReader;
import java.io.IOException;

/** Versão 1 para áreas; versão 2 também aceita pontos. Normalização por lista branca. */
final class PolygonDocument {
    static final int MAX_BYTES = 10 * 1024 * 1024;

    // JSONObject sozinho aceita sintaxe que JSON.parse rejeita, como nomes sem aspas.
    static JSONObject parse(String content) throws JSONException {
        try (JsonReader reader = new JsonReader(new StringReader(content))) {
            reader.setLenient(false);
            Object value = readValue(reader, 0);
            if (!(value instanceof JSONObject) || reader.peek() != JsonToken.END_DOCUMENT) throw new IOException();
            return (JSONObject) value;
        } catch (Exception error) { throw invalid("O arquivo não contém um JSON válido."); }
    }

    private static Object readValue(JsonReader reader, int depth) throws IOException, JSONException {
        if (depth > 64) throw new IOException("JSON muito profundo");
        switch (reader.peek()) {
            case BEGIN_OBJECT:
                JSONObject object = new JSONObject();
                reader.beginObject();
                while (reader.hasNext()) object.put(reader.nextName(), readValue(reader, depth + 1));
                reader.endObject();
                return object;
            case BEGIN_ARRAY:
                JSONArray array = new JSONArray();
                reader.beginArray();
                while (reader.hasNext()) array.put(readValue(reader, depth + 1));
                reader.endArray();
                return array;
            case STRING: return reader.nextString();
            case BOOLEAN: return reader.nextBoolean();
            case NULL: reader.nextNull(); return JSONObject.NULL;
            case NUMBER:
                double number = Double.parseDouble(reader.nextString());
                if (!Double.isFinite(number)) throw new IOException("Número inválido");
                return number;
            default: throw new IOException("JSON inválido");
        }
    }

    static JSONObject validate(JSONObject value) throws JSONException {
        JSONArray input = value.optJSONArray("polygons");
        Object version = value.opt("version");
        if (!"poligonos".equals(value.optString("format")) || !(version instanceof Number) || (((Number) version).doubleValue() != 1 && ((Number) version).doubleValue() != 2) || input == null) {
            throw invalid("Formato inválido. Escolha um JSON exportado pelo aplicativo (versão 1 ou 2).");
        }
        if (input.length() < 1 || input.length() > 1000) throw invalid("O arquivo deve conter de 1 a 1.000 áreas ou pontos.");
        JSONArray polygons = new JSONArray();
        int vertices = 0;
        for (int i = 0; i < input.length(); i++) {
            JSONObject polygon = input.optJSONObject(i);
            String prefix = "Elemento " + (i + 1) + ": ";
            if (polygon == null || !(polygon.opt("name") instanceof String)) throw invalid(prefix + "nome inválido.");
            if (polygon.has("locked") && !(polygon.opt("locked") instanceof Boolean)) throw invalid(prefix + "bloqueio inválido.");
            if (polygon.has("color") && (!(polygon.opt("color") instanceof String) || !polygon.getString("color").matches("^#[0-9a-fA-F]{6}$"))) throw invalid(prefix + "cor inválida.");
            String name = Normalizer.normalize(polygon.getString("name"), Normalizer.Form.NFC).trim().replaceAll(" +", " ");
            if (name.isEmpty() || name.codePointCount(0, name.length()) > 30 || !name.matches("^[\\p{L}\\p{N}][\\p{L}\\p{M}\\p{N} ]*(?: \\([1-9]\\d*\\))?$")) {
                throw invalid(prefix + "use até 30 caracteres no nome; cópias podem terminar com (1), (2), etc.");
            }
            JSONObject geometry = polygon.optJSONObject("geometry");
            JSONObject sr = geometry == null ? null : geometry.optJSONObject("spatialReference");
            Object reference = sr == null ? null : sr.opt("wkid");
            if (!(reference instanceof Number)) throw invalid(prefix + "referência espacial não suportada.");
            double referenceNumber = ((Number) reference).doubleValue();
            if (referenceNumber != 4326 && referenceNumber != 3857 && referenceNumber != 102100 && referenceNumber != 102113) {
                throw invalid(prefix + "referência espacial não suportada.");
            }
            int wkid = (int) referenceNumber;
            if (geometry.has("x") || geometry.has("y")) {
                if (((Number) version).intValue() != 2 || geometry.has("rings")) throw invalid(prefix + "formato de ponto inválido. Use a versão 2 para pontos.");
                if (!(geometry.opt("x") instanceof Number) || !(geometry.opt("y") instanceof Number)) throw invalid(prefix + "coordenadas inválidas.");
                double x = geometry.getDouble("x"), y = geometry.getDouble("y");
                if (!Double.isFinite(x) || !Double.isFinite(y)) throw invalid(prefix + "coordenadas inválidas.");
                if (wkid == 4326 ? Math.abs(x) > 180 || Math.abs(y) > 90 : Math.abs(x) > 20037509 || Math.abs(y) > 20037509) throw invalid(prefix + "coordenadas fora dos limites da referência espacial.");
                if (++vertices > 100000) throw invalid("O arquivo excede o limite de 100.000 pontos.");
                JSONObject output = new JSONObject().put("name", name).put("geometry", new JSONObject().put("x", x).put("y", y).put("spatialReference", new JSONObject().put("wkid", wkid)));
                if (polygon.optBoolean("locked", false)) output.put("locked", true);
                if (polygon.has("color")) output.put("color", polygon.getString("color").toLowerCase(java.util.Locale.ROOT));
                polygons.put(output);
                continue;
            }
            JSONArray inputRings = geometry.optJSONArray("rings");
            if (inputRings == null || inputRings.length() == 0) throw invalid(prefix + "desenho ausente.");
            JSONArray rings = new JSONArray();
            for (int r = 0; r < inputRings.length(); r++) {
                JSONArray ring = inputRings.optJSONArray(r);
                if (ring == null || ring.length() < 4) throw invalid(prefix + "desenhe pelo menos 3 pontos formando uma área.");
                vertices += ring.length();
                if (vertices > 100000) throw invalid("O arquivo excede o limite de 100.000 pontos.");
                double[][] points = new double[ring.length()][2];
                Set<String> distinct = new HashSet<>();
                JSONArray outputRing = new JSONArray();
                for (int p = 0; p < ring.length(); p++) {
                    JSONArray point = ring.optJSONArray(p);
                    if (point == null || point.length() != 2 || !(point.opt(0) instanceof Number) || !(point.opt(1) instanceof Number)) {
                        throw invalid(prefix + "coordenadas inválidas.");
                    }
                    double x = point.getDouble(0), y = point.getDouble(1);
                    if (!Double.isFinite(x) || !Double.isFinite(y)) throw invalid(prefix + "coordenadas inválidas.");
                    if (wkid == 4326 ? Math.abs(x) > 180 || Math.abs(y) > 90 : Math.abs(x) > 20037509 || Math.abs(y) > 20037509) {
                        throw invalid(prefix + "coordenadas fora dos limites da referência espacial.");
                    }
                    points[p] = new double[]{x, y};
                    distinct.add((x == 0 ? 0 : x) + "," + (y == 0 ? 0 : y));
                    outputRing.put(new JSONArray().put(x).put(y));
                }
                double x0 = points[0][0], y0 = points[0][1];
                double[] last = points[points.length - 1];
                if (last[0] != x0 || last[1] != y0) throw invalid(prefix + "o contorno deve estar fechado.");
                if (distinct.size() < 3) throw invalid(prefix + "use pelo menos 3 pontos diferentes.");
                double area = 0, span = 0;
                for (int p = 0; p < points.length; p++) {
                    span = Math.max(span, Math.max(Math.abs(points[p][0] - x0), Math.abs(points[p][1] - y0)));
                    if (p + 1 < points.length) area += (points[p][0] - x0) * (points[p + 1][1] - y0) - (points[p + 1][0] - x0) * (points[p][1] - y0);
                }
                if (!Double.isFinite(area) || Math.abs(area) <= span * span * 1e-10) throw invalid(prefix + "os pontos devem formar uma área.");
                rings.put(outputRing);
            }
            JSONObject outputPolygon = new JSONObject().put("name", name).put("geometry", new JSONObject().put("rings", rings).put("spatialReference", new JSONObject().put("wkid", wkid)));
            if (polygon.optBoolean("locked", false)) outputPolygon.put("locked", true);
            if (polygon.has("color")) outputPolygon.put("color", polygon.getString("color").toLowerCase(java.util.Locale.ROOT));
            polygons.put(outputPolygon);
        }
        return new JSONObject().put("format", "poligonos").put("version", ((Number) version).intValue()).put("polygons", polygons);
    }

    // A conversão/projeção ocorre no renderer; reutilizar a validação do formato nativo na escrita.
    static JSONObject validateGeoExport(JSONObject value) throws JSONException {
        JSONArray features = value.optJSONArray("features");
        if (features == null || features.length() < 1 || features.length() > 1000) throw invalid("GeoJSON deve conter de 1 a 1.000 elementos.");
        JSONArray polygons = new JSONArray();
        for (int i = 0; i < features.length(); i++) {
            JSONObject feature = features.getJSONObject(i);
            if (!"Feature".equals(feature.optString("type"))) throw invalid("GeoJSON inválido.");
            JSONObject properties = feature.getJSONObject("properties"), source = feature.getJSONObject("geometry");
            JSONObject item = new JSONObject().put("name", properties.get("name"));
            if (properties.has("color")) item.put("color", properties.get("color"));
            if (properties.has("locked")) item.put("locked", properties.get("locked"));
            JSONArray coordinates = source.getJSONArray("coordinates");
            JSONObject geometry = new JSONObject().put("spatialReference", new JSONObject().put("wkid", 4326));
            String type = source.getString("type");
            if ("Point".equals(type)) {
                if (coordinates.length() != 2) throw invalid("Coordenadas inválidas.");
                geometry.put("x", coordinates.get(0)).put("y", coordinates.get(1));
            } else {
                JSONArray parts = "Polygon".equals(type) ? new JSONArray().put(coordinates) : coordinates;
                if ((!"Polygon".equals(type) && !"MultiPolygon".equals(type)) || parts.length() == 0) throw invalid("GeoJSON inválido.");
                JSONArray rings = new JSONArray();
                for (int r = 0; r < parts.length(); r++) {
                    JSONArray part = parts.getJSONArray(r);
                    if (part.length() != 1) throw invalid("Exporte áreas sem buracos.");
                    rings.put(part.getJSONArray(0));
                }
                geometry.put("rings", rings);
            }
            polygons.put(item.put("geometry", geometry));
        }
        JSONArray normalized = validate(new JSONObject().put("format", "poligonos").put("version", 2).put("polygons", polygons)).getJSONArray("polygons");
        JSONArray output = new JSONArray();
        for (int i = 0; i < normalized.length(); i++) {
            JSONObject item = normalized.getJSONObject(i), source = item.getJSONObject("geometry");
            JSONObject properties = new JSONObject().put("name", item.get("name")), geometry = new JSONObject();
            if (item.has("color")) properties.put("color", item.get("color"));
            if (item.has("locked")) properties.put("locked", item.get("locked"));
            if (source.has("rings")) {
                JSONArray rings = source.getJSONArray("rings"), parts = new JSONArray();
                for (int r = 0; r < rings.length(); r++) parts.put(new JSONArray().put(rings.getJSONArray(r)));
                geometry.put("type", rings.length() == 1 ? "Polygon" : "MultiPolygon").put("coordinates", rings.length() == 1 ? parts.getJSONArray(0) : parts);
            } else geometry.put("type", "Point").put("coordinates", new JSONArray().put(source.get("x")).put(source.get("y")));
            output.put(new JSONObject().put("type", "Feature").put("properties", properties).put("geometry", geometry));
        }
        return new JSONObject().put("type", "FeatureCollection").put("features", output);
    }

    private static JSONException invalid(String message) { return new JSONException(message); }
}
