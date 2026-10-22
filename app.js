const express = require("express");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

let products = [
  {
    id: 1,
    name: "Wireless Headphones",
    category: "Electronics",
    price: 79.99,
    description: "Over-ear Bluetooth headphones",
    stock: 24,
  },
  {
    id: 2,
    name: "Mechanical Keyboard",
    category: "Electronics",
    price: 109.5,
    description: "Mechanical keyboard with tactile switches",
    stock: 15,
  },
  {
    id: 3,
    name: "Coffee Mug",
    category: "Home",
    price: 12.99,
    description: "Ceramic mug, 350 ml",
    stock: 50,
  },
  {
    id: 4,
    name: "Desk Lamp",
    category: "Home",
    price: 34.99,
    description: "Adjustable LED desk lamp",
    stock: 18,
  },
  {
    id: 5,
    name: "Running Shoes",
    category: "Sports",
    price: 89,
    description: "Lightweight road-running shoes",
    stock: 12,
  },
];

const productFields = ["name", "category", "price", "description", "stock"];
const sortableFields = ["id", ...productFields];
const queryParameters = [
  "id",
  "category",
  "name",
  "price",
  "minPrice",
  "maxPrice",
  "sortBy",
  "order",
];

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

function parsePositiveInteger(value) {
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parseNonNegativeNumber(value) {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function validateProductBody(body, { partial = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "The request body must be a JSON object.";
  }

  const unknownFields = Object.keys(body).filter(
    (field) => !productFields.includes(field),
  );
  if (unknownFields.length > 0) {
    return `Unknown product field(s): ${unknownFields.join(", ")}.`;
  }

  if (partial && Object.keys(body).length === 0) {
    return "Provide at least one product field to update.";
  }

  if (!partial) {
    const missingFields = productFields.filter(
      (field) => !Object.hasOwn(body, field),
    );
    if (missingFields.length > 0) {
      return `Missing required field(s): ${missingFields.join(", ")}.`;
    }
  }

  for (const field of ["name", "category", "description"]) {
    if (
      Object.hasOwn(body, field) &&
      (typeof body[field] !== "string" || body[field].trim() === "")
    ) {
      return `${field} must be a non-empty string.`;
    }
  }

  if (
    Object.hasOwn(body, "price") &&
    (typeof body.price !== "number" ||
      !Number.isFinite(body.price) ||
      body.price < 0)
  ) {
    return "price must be a non-negative number.";
  }

  if (
    Object.hasOwn(body, "stock") &&
    (!Number.isInteger(body.stock) || body.stock < 0)
  ) {
    return "stock must be a non-negative integer.";
  }

  return null;
}

function parseProductId(value, res) {
  const id = parsePositiveInteger(value);
  if (id === null) {
    sendError(res, 400, "Product ID must be a positive integer.");
    return null;
  }

  const product = products.find((item) => item.id === id);
  if (!product) {
    sendError(res, 404, `Product with ID ${id} was not found.`);
    return null;
  }

  return product;
}

app.get("/products", (req, res) => {
  const unknownParameters = Object.keys(req.query).filter(
    (parameter) => !queryParameters.includes(parameter),
  );
  if (unknownParameters.length > 0) {
    return sendError(
      res,
      400,
      `Unknown query parameter(s): ${unknownParameters.join(", ")}.`,
    );
  }

  for (const parameter of Object.keys(req.query)) {
    if (typeof req.query[parameter] !== "string") {
      return sendError(
        res,
        400,
        `Query parameter "${parameter}" must be provided once.`,
      );
    }
  }

  if (Object.hasOwn(req.query, "id")) {
    if (Object.keys(req.query).length > 1) {
      return sendError(
        res,
        400,
        'The "id" query parameter cannot be combined with other parameters.',
      );
    }

    const id = parsePositiveInteger(req.query.id);
    if (id === null) {
      return sendError(res, 400, "Query parameter \"id\" must be a positive integer.");
    }

    const product = products.find((item) => item.id === id);
    if (!product) {
      return sendError(res, 404, `Product with ID ${id} was not found.`);
    }

    return res.json(product);
  }

  let result = [...products];

  if (Object.hasOwn(req.query, "category")) {
    const category = req.query.category.trim();
    if (!category) {
      return sendError(res, 400, "Query parameter \"category\" cannot be empty.");
    }

    const knownCategory = products.some(
      (product) => product.category.toLowerCase() === category.toLowerCase(),
    );
    if (!knownCategory) {
      return sendError(res, 400, `Category "${category}" does not exist.`);
    }

    result = result.filter(
      (product) => product.category.toLowerCase() === category.toLowerCase(),
    );
  }

  if (Object.hasOwn(req.query, "name")) {
    const name = req.query.name.trim();
    if (!name) {
      return sendError(res, 400, "Query parameter \"name\" cannot be empty.");
    }
    result = result.filter(
      (product) => product.name.toLowerCase() === name.toLowerCase(),
    );
  }

  for (const parameter of ["price", "minPrice", "maxPrice"]) {
    if (Object.hasOwn(req.query, parameter)) {
      const value = parseNonNegativeNumber(req.query[parameter]);
      if (value === null) {
        return sendError(
          res,
          400,
          `Query parameter "${parameter}" must be a non-negative number.`,
        );
      }

      if (parameter === "price") {
        result = result.filter((product) => product.price === value);
      } else if (parameter === "minPrice") {
        result = result.filter((product) => product.price >= value);
      } else {
        result = result.filter((product) => product.price <= value);
      }
    }
  }

  if (
    Object.hasOwn(req.query, "minPrice") &&
    Object.hasOwn(req.query, "maxPrice") &&
    Number(req.query.minPrice) > Number(req.query.maxPrice)
  ) {
    return sendError(res, 400, '"minPrice" cannot be greater than "maxPrice".');
  }

  if (Object.hasOwn(req.query, "order") && !Object.hasOwn(req.query, "sortBy")) {
    return sendError(res, 400, '"order" requires the "sortBy" parameter.');
  }

  if (Object.hasOwn(req.query, "sortBy")) {
    const sortBy = req.query.sortBy;
    if (!sortableFields.includes(sortBy)) {
      return sendError(
        res,
        400,
        `"sortBy" must be one of: ${sortableFields.join(", ")}.`,
      );
    }

    const order = req.query.order || "asc";
    if (order !== "asc" && order !== "desc") {
      return sendError(res, 400, '"order" must be either "asc" or "desc".');
    }

    const direction = order === "asc" ? 1 : -1;
    result.sort((left, right) => {
      const leftValue = left[sortBy];
      const rightValue = right[sortBy];
      const comparison =
        typeof leftValue === "string"
          ? leftValue.localeCompare(rightValue)
          : leftValue - rightValue;
      return comparison * direction;
    });
  }

  return res.json(result);
});

app.get("/products/:id", (req, res) => {
  const product = parseProductId(req.params.id, res);
  if (product) {
    return res.json(product);
  }
});

app.post("/products", (req, res) => {
  const validationError = validateProductBody(req.body);
  if (validationError) {
    return sendError(res, 400, validationError);
  }

  const product = {
    id: Math.max(0, ...products.map((item) => item.id)) + 1,
    ...req.body,
    name: req.body.name.trim(),
    category: req.body.category.trim(),
    description: req.body.description.trim(),
  };
  products.push(product);
  return res.status(201).json(product);
});

app.put("/products/:id", (req, res) => {
  const product = parseProductId(req.params.id, res);
  if (!product) {
    return;
  }

  const validationError = validateProductBody(req.body);
  if (validationError) {
    return sendError(res, 400, validationError);
  }

  const replacement = {
    id: product.id,
    ...req.body,
    name: req.body.name.trim(),
    category: req.body.category.trim(),
    description: req.body.description.trim(),
  };
  products = products.map((item) => (item.id === product.id ? replacement : item));
  return res.json(replacement);
});

app.patch("/products/:id", (req, res) => {
  const product = parseProductId(req.params.id, res);
  if (!product) {
    return;
  }

  const validationError = validateProductBody(req.body, { partial: true });
  if (validationError) {
    return sendError(res, 400, validationError);
  }

  const updates = { ...req.body };
  for (const field of ["name", "category", "description"]) {
    if (Object.hasOwn(updates, field)) {
      updates[field] = updates[field].trim();
    }
  }

  const updatedProduct = { ...product, ...updates };
  products = products.map((item) =>
    item.id === product.id ? updatedProduct : item,
  );
  return res.json(updatedProduct);
});

app.delete("/products/:id", (req, res) => {
  const product = parseProductId(req.params.id, res);
  if (!product) {
    return;
  }

  products = products.filter((item) => item.id !== product.id);
  return res.status(204).send();
});

app.use((req, res) => {
  return sendError(res, 404, "Route not found.");
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return sendError(res, 400, "Request body contains invalid JSON.");
  }

  if (error.status === 413) {
    return sendError(res, 413, "Request body is too large.");
  }

  console.error("Unhandled API error:", error);
  return sendError(res, 500, "An unexpected server error occurred.");
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Products API listening on http://localhost:${port}`);
  });
}

module.exports = app;
