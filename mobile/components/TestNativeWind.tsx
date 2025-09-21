import { View, Text, Pressable } from "react-native";

export default function TestNativeWind() {
  return (
    <View className="flex-1 items-center justify-center bg-background p-4">
      <Text className="text-2xl font-semibold text-foreground mb-4">
        NativeWind Test 👋
      </Text>
      <Text className="text-base text-foreground/80 text-center mb-6">
        Ak vidíš tento text správne naštýlovaný, NativeWind funguje!
      </Text>
      <Pressable className="rounded-2xl bg-primary px-6 py-3 active:opacity-80">
        <Text className="text-base font-medium text-primary-foreground">
          Pípnuť do práce
        </Text>
      </Pressable>
    </View>
  );
}
