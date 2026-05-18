"use client";

import { useState } from "react";
import { AnonAvatar } from "./AnonAvatar";

interface Props {
  src: string | null | undefined;
  size?: number;
  className?: string;
}

export function UserAvatar({ src, size = 40, className = "" }: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <AnonAvatar size={size} className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
