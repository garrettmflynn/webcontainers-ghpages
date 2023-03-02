import express from 'express';
import cors from 'cors'
var app = express()

app.use(cors())

const port = 3111;

app.get('/', (req, res) => {
  res.send('Welcome to a WebContainers app! 🥳');
});

app.get('/test', (req, res) => {
    res.send('this is a test');
  });
  

app.listen(port, () => {
  console.log(`App is live at http://localhost:${port}`);
});