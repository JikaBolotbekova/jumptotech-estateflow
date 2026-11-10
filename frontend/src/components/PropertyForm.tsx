import { useState, type FormEvent } from 'react';
import type { NewProperty } from '../api';

interface PropertyFormProps {
  onCreate: (property: NewProperty) => void;
}

export function PropertyForm({ onCreate }: PropertyFormProps) {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsedPrice = Number(price);
    if (!title.trim() || Number.isNaN(parsedPrice)) return;

    onCreate({
      title,
      price: parsedPrice,
      description: null,
      address: null,
      bedrooms: null,
      bathrooms: null,
    });
    setTitle('');
    setPrice('');
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        aria-label="title"
        placeholder="Property title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        aria-label="price"
        placeholder="Price"
        type="number"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />
      <button type="submit">Add property</button>
    </form>
  );
}
