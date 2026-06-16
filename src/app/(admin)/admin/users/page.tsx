import { getAllUsers } from "@/db/queries/users";
import { UsersClient } from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await getAllUsers();
  return <UsersClient initialUsers={users} />;
}
