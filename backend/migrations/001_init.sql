CREATE TABLE IF NOT EXISTS properties (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL,
    address VARCHAR(255),
    bedrooms SMALLINT,
    bathrooms SMALLINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO properties (title, description, price, address, bedrooms, bathrooms)
VALUES
    ('Downtown Loft', 'Bright open-plan loft near the city center.', 325000, '12 Market St', 2, 1),
    ('Suburban Family Home', 'Spacious 4-bed house with a large backyard.', 450000, '48 Maple Ave', 4, 3),
    ('Lakeside Cottage', 'Cozy cottage with private lake access.', 275000, '7 Lake Shore Rd', 2, 2)
ON CONFLICT DO NOTHING;
