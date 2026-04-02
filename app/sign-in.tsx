import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth-store";

export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    const error = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (error) {
      Alert.alert("Sign in failed", error);
    } else {
      router.replace("/(tabs)/profile");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 px-6 justify-center">
          <View className="mb-10">
            <Text className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Welcome back
            </Text>
            <Text className="text-slate-500 dark:text-slate-400">
              Sign in to sync your workouts
            </Text>
          </View>

          <View className="gap-4 mb-6">
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              className="bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-4 text-slate-900 dark:text-white"
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              className="bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-4 text-slate-900 dark:text-white"
            />
          </View>

          <Pressable
            onPress={handleSignIn}
            disabled={loading || !email.trim() || !password}
            className="bg-primary-500 rounded-xl py-4 items-center active:bg-primary-600 disabled:opacity-50"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">Sign In</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.replace("/sign-up")} className="mt-6 items-center">
            <Text className="text-slate-500 dark:text-slate-400">
              No account?{" "}
              <Text className="text-primary-500 font-semibold">Sign up</Text>
            </Text>
          </Pressable>

          <Pressable onPress={() => router.back()} className="mt-4 items-center">
            <Text className="text-slate-400 dark:text-slate-500">Continue without signing in</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
