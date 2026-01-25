import { View, Text, ScrollView, Pressable, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

export default function ProfileScreen() {
  const [darkMode, setDarkMode] = useState(false);
  const [useKg, setUseKg] = useState(true);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      <ScrollView className="flex-1 px-4">
        {/* Header */}
        <View className="py-6">
          <Text className="text-2xl font-bold text-slate-900 dark:text-white">
            Profile
          </Text>
        </View>

        {/* User Profile Card */}
        <View className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 mb-6">
          <View className="flex-row items-center">
            <View className="w-16 h-16 bg-primary-500 rounded-full items-center justify-center">
              <Ionicons name="person" size={32} color="white" />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-lg font-semibold text-slate-900 dark:text-white">
                Guest User
              </Text>
              <Text className="text-slate-500 dark:text-slate-400">
                Sign in to sync your data
              </Text>
            </View>
          </View>
          <Pressable className="bg-primary-500 rounded-lg py-3 mt-4 active:bg-primary-600">
            <Text className="text-white font-semibold text-center">
              Sign In
            </Text>
          </Pressable>
        </View>

        {/* Settings Section */}
        <Text className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
          Settings
        </Text>

        <View className="bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
          {/* Units */}
          <View className="flex-row items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <View className="flex-row items-center">
              <Ionicons name="scale" size={24} color="#10b981" />
              <Text className="ml-3 text-slate-900 dark:text-white">
                Weight Unit
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-slate-500 dark:text-slate-400 mr-2">
                {useKg ? "kg" : "lbs"}
              </Text>
              <Switch
                value={useKg}
                onValueChange={setUseKg}
                trackColor={{ false: "#64748b", true: "#10b981" }}
              />
            </View>
          </View>

          {/* Theme */}
          <View className="flex-row items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <View className="flex-row items-center">
              <Ionicons name="moon" size={24} color="#10b981" />
              <Text className="ml-3 text-slate-900 dark:text-white">
                Dark Mode
              </Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: "#64748b", true: "#10b981" }}
            />
          </View>

          {/* Notifications */}
          <Pressable className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center">
              <Ionicons name="notifications" size={24} color="#10b981" />
              <Text className="ml-3 text-slate-900 dark:text-white">
                Notifications
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </Pressable>
        </View>

        {/* Data Section */}
        <Text className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
          Data
        </Text>

        <View className="bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
          {/* Export */}
          <Pressable className="flex-row items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <View className="flex-row items-center">
              <Ionicons name="download" size={24} color="#10b981" />
              <Text className="ml-3 text-slate-900 dark:text-white">
                Export Data
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </Pressable>

          {/* Sync Status */}
          <View className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center">
              <Ionicons name="cloud" size={24} color="#10b981" />
              <Text className="ml-3 text-slate-900 dark:text-white">
                Sync Status
              </Text>
            </View>
            <Text className="text-slate-500 dark:text-slate-400">
              Not synced
            </Text>
          </View>
        </View>

        {/* App Info */}
        <View className="items-center py-6">
          <Text className="text-slate-400 dark:text-slate-500">
            GymTrack v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
