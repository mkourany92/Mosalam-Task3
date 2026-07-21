const apiBase = "/api";

export async function fetchUsers() {
  const response = await fetch(`${apiBase}/users`);
  if (!response.ok) throw new Error("Failed to load users");
  return response.json();
}

export async function fetchUser(id) {
  const response = await fetch(`${apiBase}/users/${id}`);
  if (!response.ok) throw new Error("User not found");
  return response.json();
}