# Products API

A small Express API for managing an in-memory list of products. Data resets when
the server restarts.

## Run

```bash
npm install
npm start
```

The server listens on `http://localhost:3000` by default. Set the `PORT`
environment variable to use a different port.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/products` | List products; accepts filters and sorting below |
| GET | `/products/:id` | Get one product by its path ID |
| POST | `/products` | Create a product |
| PUT | `/products/:id` | Replace all product fields |
| PATCH | `/products/:id` | Update selected product fields |
| DELETE | `/products/:id` | Delete a product |

Product fields are `name` (string), `category` (string), `price` (non-negative
number), `description` (string), and `stock` (non-negative integer). IDs are
assigned by the API.

### List, filter, and sort

`GET /products` supports these query parameters:

| Parameter | Example | Behavior |
| --- | --- | --- |
| `id` | `/products?id=2` | Return one product; cannot be combined with other parameters |
| `category` | `/products?category=Home` | Match an existing category, case-insensitively |
| `name` | `/products?name=Coffee%20Mug` | Match a product name, case-insensitively |
| `price` | `/products?price=34.99` | Match an exact price |
| `minPrice` | `/products?minPrice=20` | Match products at or above a price |
| `maxPrice` | `/products?maxPrice=90` | Match products at or below a price |
| `sortBy` | `/products?sortBy=price` | Sort by `id`, `name`, `category`, `price`, `description`, or `stock` |
| `order` | `/products?sortBy=price&order=desc` | Sort `asc` or `desc`; defaults to `asc` when `sortBy` is set |

Filters can be combined, for example:

```text
GET /products?category=Home&minPrice=10&sortBy=price&order=asc
```

Unknown, repeated, or invalid query parameters return a JSON error with status
`400`. A valid but nonexistent product ID returns `404`.

## Example requests

Create a product:

```http
POST /products
Content-Type: application/json

{
  "name": "Water Bottle",
  "category": "Sports",
  "price": 19.99,
  "description": "Reusable stainless steel bottle",
  "stock": 30
}
```

Replace all fields with `PUT`, or send only the fields to change with `PATCH`.
Successful creation returns `201`; deletion returns `204`.
