import { useAuth, useClerk } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SSOCallbackScreen() {
  const clerk = useClerk();
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function handleCallback() {
      try {
        if (typeof (clerk as any).handleRedirectCallback === "function") {
          await (clerk as any).handleRedirectCallback();
        }

        if (isMounted) {
          router.replace("/(tabs)");
        }
      } catch (err) {
        console.error("SSO Callback Error:", err);
        if (isMounted) {
          router.replace("/(auth)");
        }
      }
    }

    if (isLoaded) {
      if (isSignedIn) {
        router.replace("/(tabs)");
      } else {
        handleCallback();
      }
    }

    return () => {
      isMounted = false;
    };
  }, [clerk, isLoaded, isSignedIn, router]);

  return (
    <SafeAreaView className="flex-1 bg-background justify-center items-center">
      <View className="items-center gap-4">
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text className="text-foreground text-sm font-medium">Completing sign-in...</Text>
      </View>
    </SafeAreaView>
  );
}
