import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { BloodDrop } from '@/components/blood-drop';
import { QRCode } from '@/components/qr-code';
import { Brand } from '@/constants/brand';
import { Spacing } from '@/constants/theme';

export function QRShareButton({
  title,
  subtitle,
  url,
  size = 28,
}: {
  title: string;
  subtitle: string;
  url: string;
  size?: number;
}) {
  const [visible, setVisible] = useState(false);

  const handleShare = async () => {
    await Share.share({
      message: `${title}\n${subtitle}\n${url}`,
      url,
    });
  };

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        style={({ pressed }) => [styles.qrBtn, pressed && styles.pressed]}
        hitSlop={6}>
        <SymbolView
          name={{ ios: 'qrcode', android: 'qr_code_2', web: 'qr_code' } as never}
          size={size}
          tintColor={Brand.red}
        />
      </Pressable>

      <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <BloodDrop size={24} />
              <Text style={styles.modalTitle}>Share</Text>
              <Pressable onPress={() => setVisible(false)} hitSlop={12}>
                <SymbolView
                  name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'x' } as never}
                  size={24}
                  tintColor="#94a3b8"
                />
              </Pressable>
            </View>

            <View style={styles.qrContainer}>
              <QRCode value={url} size={200} />
            </View>

            <Text style={styles.shareTitle}>{title}</Text>
            <Text style={styles.shareSubtitle}>{subtitle}</Text>
            <Text style={styles.shareUrl} numberOfLines={1}>{url}</Text>

            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}>
              <SymbolView
                name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share_2' } as never}
                size={18}
                tintColor="#fff"
              />
              <Text style={styles.shareBtnText}>Share</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  qrBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: Spacing.five,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    width: '100%',
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#f1f5f9',
    marginVertical: Spacing.two,
  },
  shareTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  shareSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  shareUrl: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    maxWidth: 280,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Brand.red,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: Spacing.three,
    width: '100%',
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});