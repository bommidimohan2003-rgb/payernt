import { createFileRoute } from "@tanstack/react-router";
import APIKeys from "@/admin/pages/APIKeys";

export const Route = createFileRoute("/admin/api-keys")({
  component: APIKeys,
});
export default Route;
