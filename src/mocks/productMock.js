
// const contenedorProductos = require("../managers/contenedorProductos")
import { faker } from '@faker-js/faker'
const {datatype, commerce, image} = faker;

class ProductMock {
    constructor(){
        this.products = [];
    }

    produce(cantidad){
        let newProducts = [];
        for(let i=0;i<cantidad;i++){
            newProducts.push(
                {
                    id: datatype.uuid(),
                    title:commerce.product() ,
                    price: commerce.price(),
                    thumbnail: image.imageUrl()
                }
            )
        }
        this.products = [...this.products, ...newProducts];
        return newProducts;
    }
}

export default ProductMock;