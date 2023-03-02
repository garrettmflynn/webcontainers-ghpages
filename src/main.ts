import './style.css'
import { WebContainer } from '@webcontainer/api';
import { files } from './files';
import { Terminal } from 'xterm'
import 'xterm/css/xterm.css';
import { FitAddon } from 'xterm-addon-fit';

const app = document.querySelector('#app') as HTMLDivElement;
app.innerHTML = `
<div class="container">
  <div class="editor">
    <textarea></textarea>
  </div>
  <div class="preview">
    <iframe src="loading.html"></iframe>
  </div>
</div>
<div class="terminal"></div>
`

/** @type {HTMLIFrameElement | null} */
const iframeEl = document.querySelector('iframe') as HTMLIFrameElement;

/** @type {HTMLTextAreaElement | null} */
const textareaEl = document.querySelector('textarea') as HTMLTextAreaElement;

/** @type {HTMLTextAreaElement | null} */
const terminalEl = document.querySelector('.terminal') as HTMLDivElement;

/** @type {import('@webcontainer/api').WebContainer}  */

async function installDependencies(this: WebContainer, terminal: Terminal) {
  // Install dependencies
  const installProcess = await this.spawn('npm', ['install']);

  installProcess.output.pipeTo(new WritableStream({
    write(data) {
      terminal.write(data);
    }
  }));
  // Wait for install command to exit
  return installProcess.exit;
}

/**
 * @param {Terminal} terminal
 */
async function startShell(this: WebContainer, terminal: Terminal) {
  const shellProcess = await this.spawn('jsh', {
    terminal: {
      cols: terminal.cols,
      rows: terminal.rows,
    },
  });

  shellProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        terminal.write(data);
      },
    })
  );

  const input = shellProcess.input.getWriter();
  terminal.onData((data) => {
    input.write(data);
  });

  return shellProcess;
};

// async function startDevServer(this: WebContainer, terminal: Terminal) {
//   // Run `npm run start` to start the Express app
//   const serverProcess = await this.spawn('npm', ['run', 'start']);

//   serverProcess.output.pipeTo(
//     new WritableStream({
//       write(data) {
//         terminal.write(data);
//       },
//     })
//   );

//   // Wait for `server-ready` event
//   this.on('server-ready', (port, url) => {
//     iframeEl.src = url;
//   });
// }

/** @param {string} content*/
async function writeIndexJS(this: WebContainer, content: string) {
  await this.fs.writeFile('/index.js', content);
};

window.addEventListener('load', async () => {

  textareaEl.value = files['index.js'].file.contents;

  const fitAddon = new FitAddon();

  const terminal = new Terminal({
    convertEol: true,
  });
  terminal.loadAddon(fitAddon);

  terminal.open(terminalEl);
  fitAddon.fit();

  // Call only once
  const webcontainerInstance = await WebContainer.boot();
  await webcontainerInstance.mount(files);

  textareaEl.addEventListener('input', () => {
    writeIndexJS.call(webcontainerInstance, textareaEl.value);
  });

  const exitCode = await installDependencies.call(webcontainerInstance, terminal);
  if (exitCode !== 0) {
    throw new Error('Installation failed');
  };


   // Wait for `server-ready` event
   webcontainerInstance.on('server-ready', (_, url) => {
    iframeEl.src = url;
  });

  const shellProcess = await startShell.call(webcontainerInstance, terminal);

  window.addEventListener('resize', () => {
    fitAddon.fit();
    shellProcess.resize({
      cols: terminal.cols,
      rows: terminal.rows,
    });
  });
});
