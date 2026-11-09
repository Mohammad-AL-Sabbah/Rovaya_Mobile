import React from 'react';
import { Text, Pressable, Linking } from 'react-native';

type ExternalLinkProps = {
  href: string;
  children: React.ReactNode;
  style?: any;
};

export function ExternalLink({ href, children, style }: ExternalLinkProps) {
  return (
    <Pressable
      style={style}
      onPress={async () => {
        const supported = await Linking.canOpenURL(href);
        if (supported) {
          await Linking.openURL(href);
        }
      }}
    >
      <Text style={{ color: '#007AFF' }}>{children}</Text>
    </Pressable>
  );
}