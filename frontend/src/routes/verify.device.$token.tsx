import { createFileRoute } from "@tanstack/react-router";
import DeviceVerificationPage from "@/pages/DeviceVerificationPage";
import { getSeoMetadata } from "@/utils/seo";

export const Route = createFileRoute("/verify/device/$token")({
  head: () =>
    getSeoMetadata({
      title: "Device Verification & Security Identity | Payent",
      description: "Cryptographically verify authentic registered equipment and hardware status on Payent.",
      path: "/verify/device",
    }),
  component: DeviceVerificationPage,
});
