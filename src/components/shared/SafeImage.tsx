"use client";

import Image, { ImageProps } from "next/image";
import { useState, useEffect } from "react";
import wsrvLoader from "@/lib/imagekit/loader";

export function SafeImage({ src, alt, onError, ...props }: ImageProps) {
  const [imgSrc, setImgSrc] = useState(src);

  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  const isBypassed = typeof imgSrc === "string" && imgSrc.includes("bypass-loader=true");

  return (
    <Image
      alt={alt}
      {...props}
      loader={isBypassed ? undefined : wsrvLoader}
      unoptimized={isBypassed || props.unoptimized}
      src={imgSrc}
      onError={(e) => {
        // If loading failed (probably due to wsrv.nl proxy issue), conmute to original image directly bypassing the loader
        if (
          typeof src === "string" &&
          src.startsWith("http") &&
          !imgSrc.toString().includes("bypass-loader=true")
        ) {
          const separator = src.includes("?") ? "&" : "?";
          setImgSrc(`${src}${separator}bypass-loader=true`);
        }
        if (onError) onError(e);
      }}
    />
  );
}
