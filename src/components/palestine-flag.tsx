import React from 'react';
import { Image } from 'react-native';

/** علم فلسطين كصورة (حتى لا ينعكس في الواجهات RTL) */
export function PalestineFlag({ width = 28 }: { width?: number }) {
  return (
    <Image
      source={require('../../assets/images/palestine-flag.png')}
      style={{ width, height: width / 2, borderRadius: 2 }}
      resizeMode="cover"
    />
  );
}
