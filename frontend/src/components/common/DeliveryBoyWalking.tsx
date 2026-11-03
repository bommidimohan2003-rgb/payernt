import React from "react";
import { DeliveryBoyLoader } from "./DeliveryBoyLoader";

export interface DeliveryBoyWalkingProps {
  className?: string;
  size?: number | string;
  statusText?: string;
}

/**
 * Re-export wrapper for DeliveryBoyLoader to preserve backward compatibility.
 */
export function DeliveryBoyWalking(props: DeliveryBoyWalkingProps) {
  return <DeliveryBoyLoader className={props.className} size={props.size} />;
}

export default DeliveryBoyWalking;
