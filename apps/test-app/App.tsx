import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ConfettiViz from './Confetti';

export default function App() {
  const [confettiKey, setConfettiKey] = useState(0);
  const [confettiKey2, setConfettiKey2] = useState(0);
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable onPress={() => setConfettiKey((key) => key + 1)}>
          <Text style={{ fontSize: 50 }}>🎉</Text>
        </Pressable>

        {/* <Pressable onPress={() => setConfettiKey2((key) => key + 1)}>
          <Text style={{ fontSize: 50 }}>🎉</Text>
        </Pressable> */}
      </View>

      {confettiKey > 0 ? <ConfettiViz key={confettiKey} /> : null}
      {/* {confettiKey2 > 0 ? <ConfettiViz key={confettiKey2} /> : null} */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {},
});
