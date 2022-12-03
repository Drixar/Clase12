import express from 'express';
// const Contenedor = require("../managers/contenedorProductos");
import {ContenedorMysql} from "../managers/contenedorSql.js";
import options from "../config/dbConfig.js";

const productsRouter = express.Router();

// const productosApi = new Contenedor("productos.txt");
const productosApi = new ContenedorMysql(options.mariaDB, "products");

productsRouter.get('/',async(req,res)=>{
    const productos = await productosApi.getAll();
    res.send(productos);
})

productsRouter.get('/:id',async(req,res)=>{
    const productId = req.params.id;
    const product = await productosApi.getById(parseInt(productId));
    if(product){
        return res.send(product)
    } else{
        return res.send({error : 'producto no encontrado'})
    }
})

productsRouter.post('/',async(req,res)=>{
    const newProduct = req.body;
    const result = await productosApi.save(newProduct);
    res.send(result);
})

productsRouter.put('/:id',async(req,res)=>{
    const cambioObj = req.body;
    const productId = req.params.id;
    const result = await productosApi.updateById(parseInt(productId),cambioObj);
    res.send(result);
})

productsRouter.delete('/:id',async(req,res)=>{
    const productId = req.params.id;
    const result = await productosApi.deleteById(parseInt(productId));
    res.send(result);
})

export {productsRouter};