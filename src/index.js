// Modules
const os = require('os');
const jetpack = require('fs-jetpack');
const path = require('path');
const fetch = require('wonderful-fetch');
const downloads = require('downloads-folder');
const powertools = require('node-powertools');


// Main
module.exports = async function () {
  const interval = setInterval(() => {
    log('Still downloading, please be patient! :)');
  }, 3000);

  try {
    // Clear
    clear();

    // Download
    await download();

    // Launch
    launch()
    .then(() => {
      install();
    });

    return
  } catch (e) {
    error('Failed to download:', e);
    error('Ensure you are using the right Node.js version');
    error('Alternatively, download the app manually from:', getURL());
  } finally {
    clearInterval(interval);
  }
};

if (require.main === module) {
  module.exports();
}

function clear() {
  const location = getDownloadPath();

  log(`Clearing ${location}`)

  jetpack.remove(location);
}

function download(location) {
  return new Promise(async function(resolve, reject) {
    const location = getDownloadPath();
    const url = getURL();

    log(`Downloading app to ${location} from ${url}`);

    // Process
    const res = await fetch(url);
    const fileStream = jetpack.createWriteStream(location);

    await new Promise((resolve, reject) => {
      res.body.pipe(fileStream);
      res.body.on('error', reject);

      fileStream.on('finish', resolve);
    })
    .then((r) => {
      log('Download finished!');
    })
    .catch((e) => {
      error('Download failed!', e);
    })

    return resolve();
  });
}

function getDownloadPath() {
  const url = getURL();
  const packageJSON = jetpack.read(path.join(process.cwd(), 'package.json'), 'json');

  return path.join(downloads(), url.split('/').slice(-1)[0]);
}

function getURL() {
  const name = os.type();

  if (name === 'Darwin') {
    return 'https://github.com/somiibo/download-server/releases/download/installer/Somiibo.dmg'
  } else if (name === 'Windows_NT') {
    return 'https://github.com/somiibo/download-server/releases/download/installer/Somiibo-Setup.exe'
  } else {
    return 'https://github.com/somiibo/download-server/releases/download/installer/Somiibo_amd64.deb'
  }
}

async function launch() {
  const location = getDownloadPath();
  const name = os.type();

  log(`Launching app at ${location}`)

  try {
    if (name === 'Darwin') {
      powertools.execute(`open "${location}"`)
        .then(() => {
          log('Drag the app to your Applications folder to install it');
        })
    } else if (name === 'Windows_NT') {
      powertools.execute(`"${location}"`)
        .then(() => {})
    } else {
      powertools.execute(`sudo apt install "${location}"`)
        .then(() => {
          powertools.execute(`restart-manager`).catch(e => {console.error(e)})
        })
    }
  } catch (e) {
    error('Application failed to execute:', e);
    console.log('\n\n\n')
    log(`Please launch the app manually: ${location}`);
  }
}

async function install() {
  const location = getDownloadPath();
  const name = os.type();
  const parsedPath = path.parse(location);
  const filename = parsedPath.name;

  try {
    if (name === 'Darwin') {
      log(`Attempting to install ${location}...`);

      const volumes = jetpack.list('/Volumes').sort().reverse();
      const found = volumes.find(v => v.includes(filename));
      const applicationPath = `/Applications/${filename}.app`;

      // Check if the app is mounted
      if (!found) {
        return setTimeout(() => {
          install();
        }, 1000);
      }

      // Remove the app if it already exists
      if (jetpack.exists(applicationPath)) {
        jetpack.remove(applicationPath);
      }

      // Copy the app to the Applications folder
      jetpack.copy(path.join('/Volumes', found, `${filename}.app`), applicationPath)
      await powertools.execute(`open "${applicationPath}"`);
    }
  } catch (e) {
    error('Application failed to install:', e);
    console.log('\n\n\n')
    log(`Please install the app manually: ${location}`);
  }
}

function log() {
  console.log(`[${new Date().toLocaleTimeString()}]`, ...arguments)
}

function error() {
  console.error(`[${new Date().toLocaleTimeString()}]`, ...arguments)
}
