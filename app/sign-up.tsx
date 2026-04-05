import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth-store";

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email.trim() || !password) return;
    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const error = await signUp(email.trim().toLowerCase(), password);
    setLoading(false);
    if (error) {
      Alert.alert("Sign up failed", error);
    } else {
      Alert.alert(
        "Check your email",
        "We sent a confirmation link. Click it to activate your account.",
        [{ text: "OK", onPress: () => router.replace("/sign-in") }]
      );
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
              Create account
            </Text>
            <Text className="text-slate-500 dark:text-slate-400">
              Back up and sync your workouts across devices
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
              placeholder="Password (min 6 characters)"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              className="bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-4 text-slate-900 dark:text-white"
            />
          </View>

          <Pressable
            onPress={handleSignUp}
            disabled={loading || !email.trim() || !password}
            className="bg-primary-500 rounded-xl py-4 items-center active:bg-primary-600 disabled:opacity-50"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">Create Account</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.replace("/sign-in")} className="mt-6 items-center">
            <Text className="text-slate-500 dark:text-slate-400">
              Already have an account?{" "}
              <Text className="text-primary-500 font-semibold">Sign in</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
