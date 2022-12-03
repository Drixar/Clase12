import express from 'express';
import cookieParser from "cookie-parser";
import session from "express-session";
import MongoStore from "connect-mongo";
import options from "./config/dbConfig.js";
import {productsRouter} from "./routes/products.js"
import handlebars from 'express-handlebars';
import {Server} from "socket.io";
import { normalize, schema, denormalize } from "normalizr";

import ProductMock from "./mocks/productMock.js"

import path from "path";
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import Contenedor from "./managers/contenedorProductos.js";
import ContenedorChat from './managers/contenedorChat.js';
import {ContenedorMysql} from "./managers/contenedorSql.js";

//service
// const productosApi = new Contenedor("productos.txt");
const productosApi = new ContenedorMysql(options.mariaDB, "products");
const chatApi = new ContenedorChat("chat.txt");
// const chatApi = new ContenedorMysql(options.sqliteDB,"chat");

const producApi = new ProductMock();
//server
const app = express();
app.use(express.json());
app.use(express.urlencoded({extended:true}))
app.use(express.static(__dirname+'/public'))
app.use(cookieParser());

//configuracion template engine handlebars
app.engine('handlebars', handlebars.engine());

app.set('views', __dirname+'/views');
app.set('view engine', 'handlebars');

app.use(session({
    store: MongoStore.create({
        mongoUrl: "mongodb+srv://drixar:ap548368@cluster0.zontlcc.mongodb.net/sessionsDB?retryWrites=true&w=majority"
    }),
    secret:"claveSecreta",
    resave:false,
    saveUninitialized: false,
    cookie:{
        maxAge:600000
    }
}));

//normalizacion
//Esquemas.
//esquema del author
const authorSchema = new schema.Entity("authors",{}, {idAttribute:"email"});

//esquema mensaje
const messageSchema = new schema.Entity("messages", {author: authorSchema});

//creamos nuevo objeto para normalizar la informacion
// {
//     id:"chatHistory",
//     messages:[
//         {},{},{}
//     ]
// }
//esquema global para el nuevo objeto
const chatSchema = new schema.Entity("chat", {
    messages:[messageSchema]
}, {idAttribute:"id"});
 
//la normalizacion
const normalizarData = (data)=>{
    const normalizeData = normalize({id:"chatHistory", messages:data}, chatSchema);
    return normalizeData;
};

const normalizarMensajes = async()=>{
    const results = await chatApi.getAll();
    const messagesNormalized = normalizarData(results);
    // console.log(JSON.stringify(messagesNormalized, null,"\t"));
    return messagesNormalized;
}




// routes
// Sessions
app.post("/login",(req,res)=>{
    const {user} = req.body;
    console.log(user)
    if(req.session.username){
        return res.redirect("/")
    } else{
        if(user){
            req.session.username = user;
            res.render('home',{user: req.session.username})
        } else{
            // res.send("por favor ingresa el usuario")
            res.render('login')
        }
    }
});

const checkUserLogged = (req,res,next)=>{
    if(req.session.username){
        next();
    } else{
        res.render('login')
    }
}

app.get("/perfil",checkUserLogged,(req,res)=>{
    console.log(req.session);
    res.send(`Bienvenido ${req.session.username}`);
});

app.get("/home",checkUserLogged,(req,res)=>{
    res.render('home',{user: req.session.username})
});


app.post("/logout",(req,res)=>{
    const user = req.session.username;
    req.session.destroy();
    res.render('logout',{user: user})

});

// routes

//view routes
app.get('/', checkUserLogged,(req,res)=>{
    res.render('home',{user: req.session.username})
})

app.get('/productos',checkUserLogged, async(req,res)=>{
    res.render('products',{products: await productosApi.getAll()})
})

app.get('/api/productos-test',checkUserLogged, async(req,res)=>{
    res.render('products',{products: await producApi.produce(5)})
})

//api routes
app.use('/api/products',productsRouter)



//express server
const server = app.listen(8080,()=>{
    console.log('listening on port 8080')
})


//websocket server
const io = new Server(server);

//configuracion websocket
io.on("connection",async(socket)=>{
    //PRODUCTOS
    //envio de los productos al socket que se conecta.
    io.sockets.emit("products", await productosApi.getAll())

    //recibimos el producto nuevo del cliente y lo guardamos con filesystem
    socket.on("newProduct",async(data)=>{
        await productosApi.save(data);
        //despues de guardar un nuevo producto, enviamos el listado de productos actualizado a todos los sockets conectados
        io.sockets.emit("products", await productosApi.getAll())
    })

    //CHAT
    //Envio de todos los mensajes al socket que se conecta.
    // io.sockets.emit("messages", await chatApi.getAll());
    io.sockets.emit("messages", await normalizarMensajes());

    //recibimos el mensaje del usuario y lo guardamos en el archivo chat.txt
    socket.on("newMessage", async(newMsg)=>{
        // console.log(newMsg);
        await chatApi.save(newMsg);
        io.sockets.emit("messages", await normalizarMensajes());
    });
})