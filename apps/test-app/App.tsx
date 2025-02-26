import { Pressable, StyleSheet, Text, View } from "react-native";
import ConfettiViz from "./Confetti";
import { useState } from "react";

export default function App() {
  const [confettiKey, setConfettiKey] = useState(0);
  return (
    <View style={styles.container}>
      <Pressable onPress={() => setConfettiKey((key) => key + 1)}>
        <Text style={{ fontSize: 50 }}>🎉</Text>
      </Pressable>
      <ConfettiViz key={confettiKey} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
