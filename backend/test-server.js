require('./routes/analytics');
require('./routes/upload');
require('./routes/chat');
console.log('all loaded OK');
const http=require('http');
const s=http.createServer();
s.listen(5177,'0.0.0.0',()=>{console.log('on 5177');setTimeout(()=>console.log('alive 5s'),5000);});
