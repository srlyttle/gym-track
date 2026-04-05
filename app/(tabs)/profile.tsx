import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect, useCallback } from "react";
import { useColorScheme } from "nativewind";
import { useRouter } from "expo-router";
import { exportWorkouts, shareExportFile, type ExportRange } from "@/lib/export";
import { getApiKey, setApiKey, clearApiKey } from "@/lib/ai/claude";
import { useSettingsStore } from "@/stores/settings-store";
import { useAuthStore } from "@/stores/auth-store";
import {
  addBodyMeasurement,
  getBodyMeasurements,
  getLatestBodyMeasurement,
  getLifetimeStats,
  type LifetimeStats,
} from "@/lib/db/workouts";
import {
  backupAllToCloud,
  restoreFromCloud,
  getLastSyncedAt,
} from "@/lib/sync";
import type { BodyMeasurement } from "@/types";

export default function ProfileScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const {
    unitPreference, setUnitPreference,
    themePreference, setThemePreference,
    displayName, setDisplayName,
  } = useSettingsStore();
  const { user, isAuthenticated, signOut } = useAuthStore();

  // API key state
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState("");

  // Export state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Display name editing
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState("");

  // Body weight state
  const [latestWeight, setLatestWeight] = useState<BodyMeasurement | null>(null);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showWeightHistory, setShowWeightHistory] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [weightNotes, setWeightNotes] = useState("");

  // Lifetime stats
  const [stats, setStats] = useState<LifetimeStats | null>(null);

  // Sync state
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const loadData = useCallback(async () => {
    const [latest, allMeasurements, lifetimeStats, key, lastSync] = await Promise.all([
      getLatestBodyMeasurement(),
      getBodyMeasurements(7),
      getLifetimeStats(),
      getApiKey(),
      getLastSyncedAt(),
    ]);
    setLatestWeight(latest);
    setMeasurements(allMeasurements);
    setStats(lifetimeStats);
    setLastSyncedAt(lastSync);
    if (key) {
      setHasApiKey(true);
      setMaskedKey(`sk-...${key.slice(-4)}`);
    } else {
      setHasApiKey(false);
      setMaskedKey("");
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveApiKey = async () => {
    const trimmed = apiKeyInput.trim();
    if (trimmed) await setApiKey(trimmed);
    else await clearApiKey();
    setApiKeyInput("");
    setShowApiKeyModal(false);
    await loadData();
  };

  const handleSaveName = () => {
    setDisplayName(nameInput.trim());
    setShowNameModal(false);
  };

  const handleLogWeight = async () => {
    const val = parseFloat(weightInput);
    if (isNaN(val) || val <= 0) {
      Alert.alert("Invalid weight", "Enter a valid weight.");
      return;
    }
    await addBodyMeasurement(val, weightNotes.trim() || undefined);
    setWeightInput("");
    setWeightNotes("");
    setShowWeightModal(false);
    await loadData();
  };

  const handleBackup = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const { workouts } = await backupAllToCloud(user.id);
      await loadData();
      Alert.alert("Backup complete", `${workouts} workout${workouts !== 1 ? "s" : ""} backed up.`);
    } catch {
      Alert.alert("Backup failed", "Something went wrong. Try again.");
    } finally {
      setSyncing(false);
    }
  };

  const handleRestore = () => {
    if (!user) return;
    Alert.alert(
      "Restore from cloud",
      "This will merge your cloud data into this device. Local data won't be deleted. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          onPress: async () => {
            setRestoring(true);
            try {
              const { workouts } = await restoreFromCloud(user.id);
              await loadData();
              Alert.alert("Restore complete", `${workouts} workout${workouts !== 1 ? "s" : ""} restored.`);
            } catch {
              Alert.alert("Restore failed", "Something went wrong. Try again.");
            } finally {
              setRestoring(false);
            }
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: signOut },
    ]);
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
          { text: "Share", onPress: () => shareExportFile(filePath) },
        ]
      );
    } catch {
      Alert.alert("Export Failed", "Something went wrong while exporting your data.");
    } finally {
      setExporting(false);
    }
  };

  const formatVolume = (vol: number) =>
    vol >= 1000 ? `${(vol / 1000).toFixed(1)}k` : vol.toFixed(0);

  const formatWeight = (w: number) =>
    unitPreference === "lbs" ? `${(w * 2.205).toFixed(1)} lbs` : `${w} kg`;

  const formatMuscle = (m: string | null) =>
    m ? m.charAt(0).toUpperCase() + m.slice(1) : "—";

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const formatSyncTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
      " at " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900">
      <ScrollView className="flex-1 px-4">
        <View className="py-6">
          <Text className="text-2xl font-bold text-slate-900 dark:text-white">Profile</Text>
        </View>

        {/* User Profile Card */}
        <Pressable
          onPress={() => { setNameInput(displayName); setShowNameModal(true); }}
          className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 mb-4 active:opacity-80"
        >
          <View className="flex-row items-center">
            <View className="w-16 h-16 bg-primary-500 rounded-full items-center justify-center">
              <Ionicons name="person" size={32} color="white" />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-lg font-semibold text-slate-900 dark:text-white">
                {displayName || "Set your name"}
              </Text>
              {isAuthenticated ? (
                <Text className="text-slate-500 dark:text-slate-400 text-sm">{user?.email}</Text>
              ) : (
                <Text className="text-slate-500 dark:text-slate-400 text-sm">Tap to edit</Text>
              )}
            </View>
            <Ionicons name="pencil-outline" size={18} color="#9ca3af" />
          </View>
        </Pressable>

        {/* Auth / Cloud Section */}
        {isAuthenticated ? (
          <View className="bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
            {/* Backup */}
            <Pressable
              onPress={handleBackup}
              disabled={syncing}
              className="flex-row items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 active:opacity-70"
            >
              <View className="flex-row items-center flex-1">
                <Ionicons name="cloud-upload" size={22} color="#10b981" />
                <View className="ml-3">
                  <Text className="text-slate-900 dark:text-white">Back up now</Text>
                  {lastSyncedAt && (
                    <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Last: {formatSyncTime(lastSyncedAt)}
                    </Text>
                  )}
                </View>
              </View>
              {syncing
                ? <ActivityIndicator size="small" color="#10b981" />
                : <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              }
            </Pressable>

            {/* Restore */}
            <Pressable
              onPress={handleRestore}
              disabled={restoring}
              className="flex-row items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 active:opacity-70"
            >
              <View className="flex-row items-center">
                <Ionicons name="cloud-download" size={22} color="#10b981" />
                <Text className="ml-3 text-slate-900 dark:text-white">Restore from cloud</Text>
              </View>
              {restoring
                ? <ActivityIndicator size="small" color="#10b981" />
                : <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              }
            </Pressable>

            {/* Sign out */}
            <Pressable
              onPress={handleSignOut}
              className="flex-row items-center p-4 active:opacity-70"
            >
              <Ionicons name="log-out-outline" size={22} color="#ef4444" />
              <Text className="ml-3 text-red-500 font-medium">Sign out</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => router.push("/sign-in")}
            className="bg-primary-500 rounded-xl py-3 mb-6 active:bg-primary-600"
          >
            <Text className="text-white font-semibold text-center">
              Sign in to back up your data
            </Text>
          </Pressable>
        )}

        {/* Lifetime Stats */}
        {stats && (
          <>
            <Text className="text-lg font-semibold text-slate-900 dark:text-white mb-3">All Time</Text>
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-4 items-center">
                <Text className="text-2xl font-bold text-primary-500">{stats.total_workouts}</Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1">Workouts</Text>
              </View>
              <View className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-4 items-center">
                <Text className="text-2xl font-bold text-primary-500">{formatVolume(stats.total_volume)}</Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1">Volume ({unitPreference})</Text>
              </View>
              <View className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-4 items-center">
                <Text className="text-2xl font-bold text-primary-500">{stats.total_prs}</Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1">PRs</Text>
              </View>
            </View>
            {stats.top_muscle && (
              <View className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 mb-6 flex-row items-center">
                <Ionicons name="trophy" size={20} color="#10b981" />
                <Text className="ml-3 text-slate-900 dark:text-white">
                  Favourite muscle:{" "}
                  <Text className="font-semibold text-primary-500">{formatMuscle(stats.top_muscle)}</Text>
                </Text>
              </View>
            )}
          </>
        )}

        {/* Body Weight */}
        <Text className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Body Weight</Text>
        <View className="bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
          <View className="flex-row items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <View>
              <Text className="text-slate-900 dark:text-white font-medium">
                {latestWeight ? formatWeight(latestWeight.weight!) : "Not logged"}
              </Text>
              {latestWeight && (
                <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {formatDate(latestWeight.measured_at)}
                </Text>
              )}
            </View>
            <Pressable
              onPress={() => setShowWeightModal(true)}
              className="bg-primary-500 rounded-lg px-3 py-2 active:bg-primary-600"
            >
              <Text className="text-white text-sm font-semibold">Log</Text>
            </Pressable>
          </View>

          {measurements.length > 0 && (
            <Pressable
              onPress={() => setShowWeightHistory(!showWeightHistory)}
              className="flex-row items-center justify-between p-4"
            >
              <Text className="text-slate-500 dark:text-slate-400 text-sm">
                {showWeightHistory ? "Hide" : "Show"} history ({measurements.length})
              </Text>
              <Ionicons name={showWeightHistory ? "chevron-up" : "chevron-down"} size={16} color="#9ca3af" />
            </Pressable>
          )}

          {showWeightHistory && measurements.map((m) => (
            <View key={m.id} className="flex-row items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
              <Text className="text-slate-900 dark:text-white text-sm">{formatWeight(m.weight!)}</Text>
              <View className="items-end">
                <Text className="text-xs text-slate-500 dark:text-slate-400">{formatDate(m.measured_at)}</Text>
                {m.notes && <Text className="text-xs text-slate-400 dark:text-slate-500">{m.notes}</Text>}
              </View>
            </View>
          ))}
        </View>

        {/* Settings */}
        <Text className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Settings</Text>
        <View className="bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
          <View className="flex-row items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <View className="flex-row items-center">
              <Ionicons name="scale" size={24} color="#10b981" />
              <Text className="ml-3 text-slate-900 dark:text-white">Weight Unit</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-slate-500 dark:text-slate-400 mr-2">{unitPreference}</Text>
              <Switch
                value={unitPreference === "kg"}
                onValueChange={(val) => setUnitPreference(val ? "kg" : "lbs")}
                trackColor={{ false: "#64748b", true: "#10b981" }}
              />
            </View>
          </View>

          <View className="flex-row items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <View className="flex-row items-center">
              <Ionicons name="moon" size={24} color="#10b981" />
              <Text className="ml-3 text-slate-900 dark:text-white">Dark Mode</Text>
            </View>
            <Switch
              value={themePreference === "dark"}
              onValueChange={(val) => setThemePreference(val ? "dark" : "light")}
              trackColor={{ false: "#64748b", true: "#10b981" }}
            />
          </View>

          <Pressable
            onPress={() => setShowApiKeyModal(true)}
            className="flex-row items-center justify-between p-4"
          >
            <View className="flex-row items-center">
              <Ionicons name="key" size={24} color="#10b981" />
              <Text className="ml-3 text-slate-900 dark:text-white">Claude API Key</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-slate-500 dark:text-slate-400 mr-2">
                {hasApiKey ? maskedKey : "Not configured"}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </View>
          </Pressable>
        </View>

        {/* Data */}
        <Text className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Data</Text>
        <View className="bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
          <Pressable
            onPress={() => setShowExportModal(true)}
            className="flex-row items-center justify-between p-4"
          >
            <View className="flex-row items-center">
              <Ionicons name="download" size={24} color="#10b981" />
              <Text className="ml-3 text-slate-900 dark:text-white">Export Workouts</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </Pressable>
        </View>

        <View className="items-center py-6">
          <Text className="text-slate-400 dark:text-slate-500">GymTrack v4.0.5</Text>
        </View>
      </ScrollView>

      {/* Edit Name Modal */}
      <Modal visible={showNameModal} transparent animationType="slide" onRequestClose={() => setShowNameModal(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-slate-800 rounded-t-2xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-slate-900 dark:text-white">Your Name</Text>
              <Pressable onPress={() => setShowNameModal(false)}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </Pressable>
            </View>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Enter your name"
              placeholderTextColor="#9ca3af"
              autoFocus
              className="bg-slate-100 dark:bg-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white mb-4"
            />
            <Pressable onPress={handleSaveName} className="bg-primary-500 rounded-xl py-3 active:bg-primary-600">
              <Text className="text-white font-semibold text-center">Save</Text>
            </Pressable>
            <View className="h-8" />
          </View>
        </View>
      </Modal>

      {/* Log Weight Modal */}
      <Modal visible={showWeightModal} transparent animationType="slide" onRequestClose={() => setShowWeightModal(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-slate-800 rounded-t-2xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-slate-900 dark:text-white">Log Weight</Text>
              <Pressable onPress={() => setShowWeightModal(false)}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </Pressable>
            </View>
            <TextInput
              value={weightInput}
              onChangeText={setWeightInput}
              placeholder={`Weight in ${unitPreference}`}
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              autoFocus
              className="bg-slate-100 dark:bg-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white mb-3"
            />
            <TextInput
              value={weightNotes}
              onChangeText={setWeightNotes}
              placeholder="Notes (optional)"
              placeholderTextColor="#9ca3af"
              className="bg-slate-100 dark:bg-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white mb-4"
            />
            <Pressable onPress={handleLogWeight} className="bg-primary-500 rounded-xl py-3 active:bg-primary-600">
              <Text className="text-white font-semibold text-center">Save</Text>
            </Pressable>
            <View className="h-8" />
          </View>
        </View>
      </Modal>

      {/* Export Modal */}
      <Modal visible={showExportModal} transparent animationType="slide" onRequestClose={() => setShowExportModal(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-slate-800 rounded-t-2xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-slate-900 dark:text-white">Export Workouts</Text>
              <Pressable onPress={() => setShowExportModal(false)}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </Pressable>
            </View>
            <Text className="text-slate-500 dark:text-slate-400 mb-4">
              Export your workout history as JSON. Choose a time range:
            </Text>
            {exporting ? (
              <View className="items-center py-8">
                <ActivityIndicator size="large" color="#10b981" />
                <Text className="text-slate-500 dark:text-slate-400 mt-3">Preparing export...</Text>
              </View>
            ) : (
              <View className="gap-3">
                {exportRanges.map((range) => (
                  <Pressable
                    key={range.value}
                    onPress={() => handleExport(range.value)}
                    className="bg-slate-100 dark:bg-slate-700 rounded-xl p-4 flex-row items-center justify-between active:bg-slate-200 dark:active:bg-slate-600"
                  >
                    <Text className="text-slate-900 dark:text-white font-medium">{range.label}</Text>
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
      <Modal visible={showApiKeyModal} transparent animationType="slide" onRequestClose={() => setShowApiKeyModal(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-slate-800 rounded-t-2xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-slate-900 dark:text-white">Claude API Key</Text>
              <Pressable onPress={() => setShowApiKeyModal(false)}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </Pressable>
            </View>
            <Text className="text-slate-500 dark:text-slate-400 mb-4">
              Enter your Anthropic API key to enable AI workout suggestions. Stored locally on this device.
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
            <Pressable onPress={handleSaveApiKey} className="bg-primary-500 rounded-xl py-3 active:bg-primary-600">
              <Text className="text-white font-semibold text-center">
                {apiKeyInput.trim() ? "Save Key" : hasApiKey ? "Remove Key" : "Cancel"}
              </Text>
            </Pressable>
            <View className="h-8" />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
