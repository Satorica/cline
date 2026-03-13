import { BANNER_DATA, BannerAction, BannerActionType, BannerCardData } from "@shared/cline/banner"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import BannerCarousel from "@/components/common/BannerCarousel"
import WhatsNewModal from "@/components/common/WhatsNewModal"
import HistoryPreview from "@/components/history/HistoryPreview"
import { useApiConfigurationHandlers } from "@/components/settings/utils/useApiConfigurationHandlers"
import HomeHeader from "@/components/welcome/HomeHeader"
import { SuggestedTasks } from "@/components/welcome/SuggestedTasks"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { StateServiceClient, UiServiceClient } from "@/services/grpc-client"
import { convertBannerData } from "@/utils/bannerUtils"
import { getCurrentPlatform } from "@/utils/platformUtils"
import { WelcomeSectionProps } from "../../types/chatTypes"

/**
 * Welcome section shown when there's no active task
 * Includes info banner, announcements, home header, and history preview
 */
export const WelcomeSection: React.FC<WelcomeSectionProps> = ({
	showAnnouncement,
	hideAnnouncement,
	showHistoryView,
	version,
	taskHistory,
	shouldShowQuickWins,
}) => {
	const { lastDismissedInfoBannerVersion, lastDismissedCliBannerVersion, lastDismissedModelBannerVersion, dismissedBanners } =
		useExtensionState()

	// Track if we've shown the "What's New" modal this session
	const [hasShownWhatsNewModal, setHasShownWhatsNewModal] = useState(false)
	const [showWhatsNewModal, setShowWhatsNewModal] = useState(false)
	const bannerWaitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const { openRouterModels, navigateToSettings, navigateToSettingsModelPicker, banners, welcomeBanners } = useExtensionState()
	const { handleFieldsChange } = useApiConfigurationHandlers()

	// Show modal when there's a new announcement and we haven't shown it this session.
	useEffect(() => {
		if (showAnnouncement && !hasShownWhatsNewModal && !bannerWaitTimeoutRef.current) {
			bannerWaitTimeoutRef.current = setTimeout(() => {
				bannerWaitTimeoutRef.current = null
				setShowWhatsNewModal(true)
				setHasShownWhatsNewModal(true)
			}, 3000)
		}
		return () => {
			if (bannerWaitTimeoutRef.current) {
				clearTimeout(bannerWaitTimeoutRef.current)
				bannerWaitTimeoutRef.current = null
			}
		}
	}, [showAnnouncement, hasShownWhatsNewModal])

	// Open modal early if welcome banners arrive before the timeout
	useEffect(() => {
		if (bannerWaitTimeoutRef.current && welcomeBanners && welcomeBanners.length > 0) {
			if (bannerWaitTimeoutRef.current) {
				clearTimeout(bannerWaitTimeoutRef.current)
				bannerWaitTimeoutRef.current = null
			}
			setShowWhatsNewModal(true)
			setHasShownWhatsNewModal(true)
		}
	}, [welcomeBanners])

	const handleCloseWhatsNewModal = useCallback(() => {
		setShowWhatsNewModal(false)
		// Call hideAnnouncement to persist dismissal (same as old banner behavior)
		hideAnnouncement()
		if (welcomeBanners && welcomeBanners.length > 0) {
			for (const banner of welcomeBanners) {
				StateServiceClient.dismissBanner({ value: banner.id }).catch(console.error)
			}
		}
	}, [hideAnnouncement, welcomeBanners])

	/**
	 * Check if a banner has been dismissed based on its ID or legacy version
	 */
	const isBannerDismissed = useCallback(
		(bannerId: string): boolean => {
			// Check if banner is in the dismissed banners list (new approach)
			if (
				dismissedBanners?.some((dismissed: { bannerId: string; dismissedAt: number }) => dismissed.bannerId === bannerId)
			) {
				return true
			}

			// Legacy version-based tracking (deprecated)
			if (bannerId.startsWith("info-banner")) {
				return (lastDismissedInfoBannerVersion ?? 0) >= 1
			}
			if (bannerId.startsWith("new-model")) {
				return (lastDismissedModelBannerVersion ?? 0) >= 1
			}
			if (bannerId.startsWith("cli-")) {
				return (lastDismissedCliBannerVersion ?? 0) >= 1
			}
			return false
		},
		[dismissedBanners, lastDismissedInfoBannerVersion, lastDismissedModelBannerVersion, lastDismissedCliBannerVersion],
	)

	/**
	 * Banner configuration from backend
	 */
	const bannerConfig = useMemo((): BannerCardData[] => {
		return BANNER_DATA.filter((banner) => {
			if (isBannerDismissed(banner.id)) {
				return false
			}

			if (banner.isClineUserOnly !== undefined) {
				return false
			}

			if (banner.platforms && !banner.platforms.includes(getCurrentPlatform())) {
				return false
			}

			return true
		})
	}, [isBannerDismissed])

	/**
	 * Action handler - maps action types to actual implementations
	 */
	const handleBannerAction = useCallback(
		(action: BannerAction) => {
			switch (action.action) {
				case BannerActionType.Link:
					if (action.arg) {
						UiServiceClient.openUrl({ value: action.arg }).catch(console.error)
					}
					break

				case BannerActionType.SetModel: {
					const modelId = action.arg || "anthropic/claude-sonnet-4.5"
					const initialModelTab = action.tab || "recommended"
					handleFieldsChange({
						planModeOpenRouterModelId: modelId,
						actModeOpenRouterModelId: modelId,
						planModeOpenRouterModelInfo: openRouterModels[modelId],
						actModeOpenRouterModelInfo: openRouterModels[modelId],
						planModeApiProvider: "openrouter",
						actModeApiProvider: "openrouter",
					})
					navigateToSettingsModelPicker({ targetSection: "api-config", initialModelTab })
					break
				}

				case BannerActionType.ShowApiSettings:
					if (action.arg) {
						// Pre-select the provider before navigating
						handleFieldsChange({
							planModeApiProvider: action.arg as any,
							actModeApiProvider: action.arg as any,
						})
					}
					navigateToSettings("api-config")
					break

				case BannerActionType.ShowFeatureSettings:
					navigateToSettings("features")
					break

				case BannerActionType.InstallCli:
					StateServiceClient.installClineCli({}).catch((error) =>
						console.error("Failed to initiate CLI installation:", error),
					)
					break

				default:
					console.warn("Unknown banner action:", action.action)
			}
		},
		[handleFieldsChange, openRouterModels, navigateToSettings, navigateToSettingsModelPicker],
	)

	/**
	 * Dismissal handler - updates version tracking
	 */
	const handleBannerDismiss = useCallback((bannerId: string) => {
		if (bannerId.startsWith("info-banner")) {
			StateServiceClient.updateInfoBannerVersion({ value: 1 }).catch(console.error)
		} else if (bannerId.startsWith("new-model")) {
			StateServiceClient.updateModelBannerVersion({ value: 1 }).catch(console.error)
		} else if (bannerId.startsWith("cli-")) {
			StateServiceClient.updateCliBannerVersion({ value: 1 }).catch(console.error)
		} else {
			StateServiceClient.dismissBanner({ value: bannerId }).catch(console.error)
		}
	}, [])

	/**
	 * Build array of active banners for carousel
	 */
	const activeBanners = useMemo(() => {
		const hardcodedBanners = bannerConfig.map((banner) =>
			convertBannerData(banner, {
				onAction: handleBannerAction,
				onDismiss: handleBannerDismiss,
			}),
		)

		const extensionStateBanners = (banners ?? []).map((banner) =>
			convertBannerData(banner, {
				onAction: handleBannerAction,
				onDismiss: handleBannerDismiss,
			}),
		)

		return [...extensionStateBanners, ...hardcodedBanners]
	}, [bannerConfig, banners, handleBannerAction, handleBannerDismiss])

	return (
		<div className="flex flex-col flex-1 w-full h-full p-0 m-0">
			<WhatsNewModal
				onBannerAction={handleBannerAction}
				onClose={handleCloseWhatsNewModal}
				open={showWhatsNewModal}
				version={version}
				welcomeBanners={welcomeBanners}
			/>
			<div className="overflow-y-auto flex flex-col pb-2.5">
				<HomeHeader shouldShowQuickWins={shouldShowQuickWins} />
				{!showWhatsNewModal && (
					<>
						<BannerCarousel banners={activeBanners} />
						{!shouldShowQuickWins && taskHistory.length > 0 && <HistoryPreview showHistoryView={showHistoryView} />}
					</>
				)}
			</div>
			<SuggestedTasks shouldShowQuickWins={shouldShowQuickWins} />
		</div>
	)
}
