import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Brand } from '@/constants/brand';
import { Spacing } from '@/constants/theme';

export type SelectOption = {
  value: string;
  label: string;
  sublabel?: string;
};

export function SelectDropdown({
  value,
  options,
  onChange,
  placeholder,
  label,
  disabled = false,
  searchable = false,
  searchPlaceholder = '',
}: {
  value: string;
  options: SelectOption[];
  onChange: (val: string) => void;
  placeholder: string;
  label: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = options.find((o) => o.value === value);
  const filtered = searchable
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(search.toLowerCase()) ||
          (o.sublabel ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : options;

  const display = selected ? selected.label : placeholder;

  const close = () => {
    setOpen(false);
    setSearch('');
  };

  return (
    <>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        style={[styles.trigger, disabled && styles.triggerDisabled]}>
        <Text style={styles.triggerLabel}>{label}</Text>
        <View style={styles.triggerValue}>
          <Text
            style={[
              styles.triggerText,
              !selected && styles.triggerPlaceholder,
            ]}
            numberOfLines={1}>
            {display}
          </Text>
          <SymbolView
            name={{ ios: 'chevron.down', android: 'arrow_drop_down', web: 'arrow_drop_down' } as never}
            size={18}
            tintColor="#94a3b8"
          />
        </View>
      </Pressable>

      <Modal
        visible={open}
        animationType="fade"
        transparent
        onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.popup} onPress={(e) => e.stopPropagation()}>
            <View style={styles.popupHeader}>
              <Text style={styles.popupTitle}>{label}</Text>
              <Pressable onPress={close} hitSlop={12}>
                <SymbolView
                  name={{ ios: 'xmark', android: 'close', web: 'close' } as never}
                  size={20}
                  tintColor="#64748b"
                />
              </Pressable>
            </View>

            {searchable && (
              <View style={styles.popupSearch}>
                <SymbolView
                  name={{ ios: 'magnifyingglass', android: 'search', web: 'search' } as never}
                  size={14}
                  tintColor="#94a3b8"
                  style={{ marginRight: 6 }}
                />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder={searchPlaceholder}
                  placeholderTextColor="#94a3b8"
                  style={styles.popupSearchInput}
                  autoFocus={false}
                />
              </View>
            )}

            <ScrollView
              style={styles.popupList}
              bounces={false}
              keyboardShouldPersistTaps="handled">
              {filtered.map((opt, idx) => {
                const isSelected = opt.value === value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      onChange(opt.value);
                      close();
                    }}
                    style={[
                      styles.popupOption,
                      isSelected
                        ? styles.popupOptionSelected
                        : idx % 2 === 0
                          ? styles.popupOptionEven
                          : styles.popupOptionOdd,
                    ]}>
                    <Text
                      style={[
                        styles.popupOptionText,
                        isSelected && styles.popupOptionTextSelected,
                      ]}>
                      {opt.label}
                    </Text>
                    {opt.sublabel ? (
                      <Text style={styles.popupOptionSub}>
                        {opt.sublabel}
                      </Text>
                    ) : null}
                    {isSelected && (
                      <SymbolView
                        name={{ ios: 'checkmark', android: 'check', web: 'check' } as never}
                        size={16}
                        tintColor={Brand.red}
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    gap: 4,
  },
  triggerDisabled: {
    opacity: 0.45,
  },
  triggerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  triggerValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
  },
  triggerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  triggerPlaceholder: {
    color: '#94a3b8',
    fontWeight: '400',
  },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  popup: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxHeight: '60%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  popupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  popupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  popupSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.two,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 38,
  },
  popupSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    paddingVertical: 0,
  },
  popupList: {
    maxHeight: 280,
    paddingHorizontal: Spacing.four,
  },
  popupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  popupOptionEven: {
    backgroundColor: '#fff',
    marginHorizontal: -Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  popupOptionOdd: {
    backgroundColor: '#fde8e8',
    marginHorizontal: -Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  popupOptionSelected: {
    backgroundColor: '#fef2f2',
    marginHorizontal: -Spacing.four,
    paddingHorizontal: Spacing.four,
    borderRadius: 10,
  },
  popupOptionText: {
    fontSize: 15,
    color: '#1e293b',
    flex: 1,
  },
  popupOptionTextSelected: {
    color: Brand.red,
    fontWeight: '700',
  },
  popupOptionSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 8,
  },
});