'use client';

import { QRCodeSVG } from 'qrcode.react';

interface QrJoinProps {
  url: string;
}

export function QrJoin({ url }: QrJoinProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <QRCodeSVG value={url} size={180} />
      <p className="text-sm text-gray-600 break-all text-center">{url}</p>
    </div>
  );
}
