/** Selector de ciudad del taller con sugerencias (lista de ciudades españolas con coordenadas). */
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '../i18n';
import { searchCities, type City } from '../utils/cities';
import { Chip, ChipRow } from './Chip';
import { Txt } from './Text';
import { TextField } from './TextField';

interface Props {
  label: string;
  value: City | null | undefined;
  onChange: (c: City) => void;
  error?: string;
}

export function CityPicker({ label, value, onChange, error }: Props) {
  const [text, setText] = useState(value ? t.city.selected(value.city) : '');
  const [open, setOpen] = useState(false);
  const results = searchCities(text);
  return (
    <View>
      <TextField
        label={label}
        value={text}
        placeholder={t.city.placeholder}
        onChangeText={(s) => {
          setText(s);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        autoCorrect={false}
        error={error}
        accessibilityHint={t.city.search}
      />
      {open ? (
        <View style={{ marginTop: 10 }}>
          {results.length ? (
            <ChipRow>
              {results.map((c) => (
                <Chip
                  key={c.city}
                  label={c.city}
                  size="sm"
                  radio
                  selected={value?.city === c.city}
                  selectedColor="#141414"
                  selectedTextColor="#FFF4E0"
                  onPress={() => {
                    onChange(c);
                    setText(t.city.selected(c.city));
                    setOpen(false);
                  }}
                />
              ))}
            </ChipRow>
          ) : (
            <Txt size={13}>{t.city.none}</Txt>
          )}
        </View>
      ) : null}
    </View>
  );
}
