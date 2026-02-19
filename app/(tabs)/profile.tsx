import { View, Text, ScrollView, Pressable, Switch, Modal, ActivityIndicator, Alert, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { exportWorkouts, shareExportFile, type ExportRange } from "@/lib/export";
import { getApiKey, setApiKey, clearApiKey } from "@/lib/ai/claude";

export default function ProfileScreen() {
  const [darkMode, setDarkMode] = useState(false);
  const [useKg, setUseKg] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState("");

  useEffect(() => {
    loadApiKeyStatus();
  }, []);

  const loadApiKeyStatus = async () => {
    const key = await getApiKey();
    if (key) {
      setHasApiKey(true);
      setMaskedKey(`sk-...${key.slice(-4)}`);
    } else {
      setHasApiKey(false);
      setMaskedKey("");
    }
  };

  const handleSaveApiKey = async () => {
    const trimmed = apiKeyInput.trim();
    if (trimmed) {
      await setApiKey(trimmed);
    } else {
      await clearApiKey();
    }
    setApiKeyInput("");
    setShowApiKeyModal(false);
    await loadApiKeyStatus();
  };

  const exportRanges: { label: string; value: ExportRange }[] = [
    { label: "Last 1 week", value: "1week" },
    { label: "Last 2 weeks", value: "2weeks" },
    { label: "Last 4 weeks", value: "4weeks" },
    { label: "Last 8 weeks", value: "8weeks" },
  ];

  const handleExport = async (range: ExportRange) => {
    setExporting(true);
    try {
      const { workoutCount, filePath } = await exportWorkouts(range);
      setShowExportModal(false);

      if (workoutCount === 0) {
        Alert.alert("No Workouts", "No completed workouts found in this period.");
        return;
      }

      Alert.alert(
        "Export Ready",
        `Exported ${workoutCount} workout${workoutCount !== 1 ? "s" : ""} as JSON.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Share",
            onPress: () => shareExportFile(filePath),
          },
        ]
      );
    } catch (error) {
      Alert.alert("Export Failed", "Something went wrong while exporting your data.");
    } finally {
      setExporting(false);
    }
  };

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
          <Pressable className="flex-row items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <View className="flex-row items-center">
              <Ionicons name="notifications" size={24} color="#10b981" />
              <Text className="ml-3 text-slate-900 dark:text-white">
                Notifications
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </Pressable>

          {/* Claude API Key */}
          <Pressable
            onPress={() => setShowApiKeyModal(true)}
            className="flex-row items-center justify-between p-4"
          >
            <View className="flex-row items-center">
              <Ionicons name="key" size={24} color="#10b981" />
              <Text className="ml-3 text-slate-900 dark:text-white">
                Claude API Key
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-slate-500 dark:text-slate-400 mr-2">
                {hasApiKey ? maskedKey : "Not configured"}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </View>
          </Pressable>
        </View>

        {/* Data Section */}
        <Text className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
          Data
        </Text>

        <View className="bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
          {/* Export */}
          <Pressable
            onPress={() => setShowExportModal(true)}
            className="flex-row items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700"
          >
            <View className="flex-row items-center">
              <Ionicons name="download" size={24} color="#10b981" />
              <Text className="ml-3 text-slate-900 dark:text-white">
                Export Workouts
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

      {/* Export Modal */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-slate-800 rounded-t-2xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-slate-900 dark:text-white">
                Export Workouts
              </Text>
              <Pressable onPress={() => setShowExportModal(false)}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </Pressable>
            </View>

            <Text className="text-slate-500 dark:text-slate-400 mb-4">
              Export your workout history as JSON for analysis. Choose a time range:
            </Text>

            {exporting ? (
              <View className="items-center py-8">
                <ActivityIndicator size="large" color="#10b981" />
                <Text className="text-slate-500 dark:text-slate-400 mt-3">
                  Preparing export...
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {exportRanges.map((range) => (
                  <Pressable
                    key={range.value}
                    onPress={() => handleExport(range.value)}
                    className="bg-slate-100 dark:bg-slate-700 rounded-xl p-4 flex-row items-center justify-between active:bg-slate-200 dark:active:bg-slate-600"
                  >
                    <Text className="text-slate-900 dark:text-white font-medium">
                      {range.label}
                    </Text>
                    <Ionicons name="download-outline" size={20} color="#10b981" />
                  </Pressable>
                ))}
              </View>
            )}

            <View className="h-8" />
          </View>
        </View>
      </Modal>
      {/* API Key Modal */}
      <Modal
        visible={showApiKeyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowApiKeyModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-slate-800 rounded-t-2xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-slate-900 dark:text-white">
                Claude API Key
              </Text>
              <Pressable onPress={() => setShowApiKeyModal(false)}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </Pressable>
            </View>

            <Text className="text-slate-500 dark:text-slate-400 mb-4">
              Enter your Anthropic API key to enable AI workout suggestions. Your key is stored locally on this device.
            </Text>

            <TextInput
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              placeholder={hasApiKey ? "Enter new key to replace" : "sk-ant-..."}
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              className="bg-slate-100 dark:bg-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white mb-4"
            />

            <View className="gap-3">
              <Pressable
                onPress={handleSaveApiKey}
                className="bg-primary-500 rounded-xl py-3 active:bg-primary-600"
              >
                <Text className="text-white font-semibold text-center">
                  {apiKeyInput.trim() ? "Save Key" : hasApiKey ? "Remove Key" : "Cancel"}
                </Text>
              </Pressable>
            </View>

            <View className="h-8" />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
