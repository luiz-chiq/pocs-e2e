import { spawn, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createWriteStream } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { resolve, join, delimiter } from 'node:path'
import net from 'node:net'

const exec = promisify(execFile)
const suffix = process.platform === 'win32' ? '.exe' : ''
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))

export async function androidEnvironment() {
  let sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT
  if (!sdk) {
    try { sdk = (await readFile('android/local.properties', 'utf8')).match(/^sdk\.dir=(.+)$/m)?.[1].trim() } catch {}
  }
  sdk ??= join(homedir(), process.platform === 'darwin' ? 'Library/Android/sdk' : 'Android/Sdk')
  let java = process.env.ANDROID_JAVA_HOME ?? process.env.JAVA_HOME
  if (!process.env.ANDROID_JAVA_HOME && process.platform === 'darwin') {
    try { java = (await exec('/usr/libexec/java_home', ['-v', '21'])).stdout.trim() } catch {}
  }
  return {
    ...process.env, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk,
    ...(java ? { JAVA_HOME: java, PATH: `${join(java, 'bin')}${delimiter}${process.env.PATH}` } : {})
  }
}

export async function prepareAndroid(env, directory) {
  const adb = join(env.ANDROID_HOME, 'platform-tools', `adb${suffix}`)
  const emulatorBinary = join(env.ANDROID_HOME, 'emulator', `emulator${suffix}`)
  const command = async args => (await exec(adb, args, { env, timeout: 15_000 })).stdout.trim()
  const devices = async () => (await command(['devices'])).split(/\r?\n/).slice(1).filter(line => /\sdevice$/.test(line)).map(line => line.split(/\s/)[0])
  let emulator, appium, logcat, serial = env.ANDROID_SERIAL
  const streams = []
  const stop = async child => {
    if (!child || child.exitCode !== null || child.signalCode !== null) return
    await new Promise(resolve => {
      const timer = setTimeout(() => { child.kill('SIGKILL'); resolve() }, 5_000)
      child.once('close', () => { clearTimeout(timer); resolve() })
      child.kill('SIGTERM')
    })
  }
  const cleanup = async () => {
    await stop(appium)
    if (emulator && serial) await command(['-s', serial, 'emu', 'kill']).catch(() => emulator.kill('SIGTERM'))
    await stop(logcat)
    await stop(emulator)
    for (const stream of streams) stream.end()
  }
  try {
    const available = await devices()
    serial ??= available.find(item => item.startsWith('emulator-'))
    if (!serial) {
      const avds = (await exec(emulatorBinary, ['-list-avds'], { env })).stdout.trim().split(/\r?\n/).filter(Boolean)
      const avd = env.ANDROID_AVD ?? avds[0]
      if (!avd) throw new Error('Nenhum dispositivo ou AVD Android disponível. Configure ANDROID_AVD ou conecte um dispositivo de testes.')
      console.log(`Iniciando Android ${avd}...`)
      const log = createWriteStream(join(directory, 'emulator.log')); streams.push(log)
      emulator = spawn(emulatorBinary, ['-avd', avd, '-no-snapshot', '-no-audio', '-no-boot-anim'], { env, stdio: ['ignore', 'pipe', 'pipe'] })
      emulator.stdout.pipe(log, { end: false }); emulator.stderr.pipe(log, { end: false })
      const deadline = Date.now() + 180_000
      while (!serial && Date.now() < deadline) {
        serial = (await devices()).find(item => item.startsWith('emulator-'))
        if (!serial) await pause(1_000)
      }
      if (!serial) throw new Error('O emulador não ficou disponível no adb. Consulte emulator.log.')
    }
    const deadline = Date.now() + 180_000
    let stable = 0
    while (stable < 5) {
      if (Date.now() > deadline) throw new Error('O Android não concluiu a inicialização.')
      const booted = await command(['-s', serial, 'shell', 'getprop', 'sys.boot_completed']).catch(() => '')
      const animation = await command(['-s', serial, 'shell', 'getprop', 'init.svc.bootanim']).catch(() => '')
      const packages = await command(['-s', serial, 'shell', 'cmd', 'package', 'path', 'android']).catch(() => '')
      stable = booted === '1' && animation !== 'running' && packages.includes('package:') ? stable + 1 : 0
      await pause(1_000)
    }
    const systemLog = createWriteStream(join(directory, 'logcat.log')); streams.push(systemLog)
    logcat = spawn(adb, ['-s', serial, 'logcat', '-v', 'threadtime'], { env, stdio: ['ignore', 'pipe', 'pipe'] })
    logcat.stdout.pipe(systemLog, { end: false }); logcat.stderr.pipe(systemLog, { end: false })
    const apk = resolve(env.ANDROID_APK ?? 'android/app/build/outputs/apk/debug/app-debug.apk')
    console.log(`Instalando APK E2E em ${serial}...`)
    await exec(adb, ['-s', serial, 'install', '-r', apk], { env, timeout: 120_000 })
    let port = env.APPIUM_PORT
    if (!port) {
      const server = net.createServer()
      await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
      port = String(server.address().port)
      await new Promise(resolve => server.close(resolve))
      const pkg = JSON.parse(await readFile('node_modules/appium/package.json', 'utf8'))
      const log = createWriteStream(join(directory, 'appium.log')); streams.push(log)
      console.log(`Iniciando Appium na porta ${port}...`)
      appium = spawn(process.execPath, [resolve('node_modules/appium', pkg.bin.appium), '--address', '127.0.0.1', '--port', port, '--allow-insecure', 'uiautomator2:chromedriver_autodownload'], { env, stdio: ['ignore', 'pipe', 'pipe'] })
      appium.stdout.pipe(log, { end: false }); appium.stderr.pipe(log, { end: false })
    }
    const host = env.APPIUM_HOST ?? '127.0.0.1'
    const readyDeadline = Date.now() + 90_000
    while (true) {
      try { if ((await (await fetch(`http://${host}:${port}/status`)).json()).value.ready) break } catch {}
      if (Date.now() > readyDeadline) throw new Error('Appium indisponível. Consulte appium.log e os drivers instalados.')
      await pause(500)
    }
    return { env: { ...env, ANDROID_SERIAL: serial, ANDROID_APK: apk, APPIUM_HOST: host, APPIUM_PORT: port }, cleanup }
  } catch (error) { await cleanup(); throw error }
}
