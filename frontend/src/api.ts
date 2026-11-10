export interface Property {
  id: number;
  title: string;
  description: string | null;
  price: number;
  address: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  created_at: string;
}

export type NewProperty = Omit<Property, 'id' | 'created_at'>;

const API_BASE = '/api/properties';

export async function fetchProperties(): Promise<Property[]> {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error(`Failed to fetch properties: ${res.status}`);
  return res.json();
}

export async function createProperty(property: NewProperty): Promise<Property> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(property),
  });
  if (!res.ok) throw new Error(`Failed to create property: ${res.status}`);
  return res.json();
}

export async function deleteProperty(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete property: ${res.status}`);
}
