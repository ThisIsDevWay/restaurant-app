import { getAllUsers } from "@/db/queries/users";
import { UsersClient } from "./UsersClient";

export default async function UsersPage() {
  const users = await getAllUsers();
  return <UsersClient initialUsers={users} />;
}
