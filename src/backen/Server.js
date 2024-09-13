// server.js (Backend and Frontend combined)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const { createStore } = require('redux');
const { Provider, connect } = require('react-redux');
const { Button, Card, CardContent, Typography, Container, Grid } = require('@material-ui/core');

// Initialize Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'build')));

// Connect to MongoDB
mongoose.connect('mongodb://localhost/ecommerce', { useNewUrlParser: true, useUnifiedTopology: true });

// Define Product Schema
const productSchema = new mongoose.Schema({
    name: String,
    price: Number,
});

const Product = mongoose.model('Product', productSchema);

// Define Order Schema
const orderSchema = new mongoose.Schema({
    products: [{ id: String, quantity: Number }],
    total: Number,
});

const Order = mongoose.model('Order', orderSchema);

// Redux setup
const ADD_TO_CART = 'ADD_TO_CART';
const REMOVE_FROM_CART = 'REMOVE_FROM_CART';
const EMPTY_CART = 'EMPTY_CART';

const addToCart = (product) => ({ type: ADD_TO_CART, payload: product });
const removeFromCart = (productId) => ({ type: REMOVE_FROM_CART, payload: productId });
const emptyCart = () => ({ type: EMPTY_CART });

const initialState = { cart: [] };

const reducer = (state = initialState, action) => {
    switch (action.type) {
        case ADD_TO_CART:
            return { ...state, cart: [...state.cart, action.payload] };
        case REMOVE_FROM_CART:
            return { ...state, cart: state.cart.filter(item => item.id !== action.payload) };
        case EMPTY_CART:
            return { ...state, cart: [] };
        default:
            return state;
    }
};

const store = createStore(reducer);

// React Components
const ProductList = ({ products, addToCart }) => (
    <div>
        {products.map(product => (
            <Card key={product._id}>
                <CardContent>
                    <Typography variant="h5">{product.name}</Typography>
                    <Typography variant="body2">${product.price}</Typography>
                    <Button onClick={() => addToCart(product)}>Add to Cart</Button>
                </CardContent>
            </Card>
        ))}
    </div>
);

const Cart = ({ cart, removeFromCart, emptyCart }) => {
    const handleCheckout = async () => {
        const total = cart.reduce((acc, item) => acc + item.price, 0);
        await fetch('/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ products: cart, total }),
        });
        emptyCart();
    };

    return (
        <div>
            {cart.map(product => (
                <Card key={product.id}>
                    <CardContent>
                        <Typography variant="h5">{product.name}</Typography>
                        <Typography variant="body2">${product.price}</Typography>
                        <Button onClick={() => removeFromCart(product.id)}>Remove</Button>
                    </CardContent>
                </Card>
            ))}
            <Button onClick={handleCheckout}>Checkout</Button>
        </div>
    );
};

const mapStateToProps = (state) => ({
    cart: state.cart
});

const mapDispatchToProps = (dispatch) => ({
    addToCart: (product) => dispatch(addToCart(product)),
    removeFromCart: (productId) => dispatch(removeFromCart(productId)),
    emptyCart: () => dispatch(emptyCart())
});

const ConnectedProductList = connect(null, mapDispatchToProps)(ProductList);
const ConnectedCart = connect(mapStateToProps, mapDispatchToProps)(Cart);

// Express routes
app.get('/products', async (req, res) => {
    const products = await Product.find();
    res.json(products);
});

app.post('/products', async (req, res) => {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(201).json(newProduct);
});

app.post('/orders', async (req, res) => {
    const { products, total } = req.body;
    const newOrder = new Order({ products, total });
    await newOrder.save();
    res.status(201).json(newOrder);
});

// Serve React frontend
app.get('*', (req, res) => {
    const products = []; // Fetch initial products data
    const html = ReactDOMServer.renderToString(
        <Provider store={store}>
            <Container>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <h1>My E-Commerce Store</h1>
                    </Grid>
                    <Grid item xs={12} md={8}>
                        <ConnectedProductList products={products} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <ConnectedCart />
                    </Grid>
                </Grid>
            </Container>
        </Provider>
    );

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>My E-Commerce Store</title>
        </head>
        <body>
            <div id="root">${html}</div>
            <script src="/static/js/bundle.js"></script>
        </body>
        </html>
    `);
});

// Start server
app.listen(5000, () => {
    console.log('Server running on http://localhost:5000');
});
