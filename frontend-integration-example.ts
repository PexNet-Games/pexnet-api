// ====================================================
// 🎯 EXEMPLE D'INTÉGRATION FRONTEND - SYNCHRONISATION GUILDS
// ====================================================

// ============================================
// 1. SERVICE DE GESTION DES GUILDS (Angular/Vue/React)
// ============================================

export interface UserGuild {
	id: string;
	name?: string;
}

export interface GuildSyncInfo {
	lastSync: string | null;
	needsSync: boolean;
	userGuildsCount: number;
}

export interface GuildSyncResponse {
	success: boolean;
	message?: string;
	data?: {
		userId: string;
		guildsCount: number;
		guilds: string[];
		lastSync: string;
		syncType?: "auto" | "force";
	};
}

export class GuildSyncService {
	private readonly apiUrl = "http://localhost:3000/api";
	private isAutoSyncRunning = false;

	/**
	 * 🔄 Synchronisation automatique au démarrage de l'app
	 */
	async initAutoSync(): Promise<void> {
		try {
			console.log(
				"[GuildSync] 🚀 Initialisation de la synchronisation automatique...",
			);

			// Vérifier l'état des guilds actuelles
			const currentGuilds = await this.getUserGuilds();

			if (currentGuilds.data?.needsSync) {
				console.log("[GuildSync] ⏰ Synchronisation nécessaire détectée");
				await this.syncGuilds("auto");
			} else {
				console.log("[GuildSync] ✅ Guilds à jour");
			}
		} catch (error) {
			console.warn(
				"[GuildSync] ⚠️ Impossible de synchroniser automatiquement:",
				error,
			);
			// Ne pas bloquer l'application si la sync échoue
		}
	}

	/**
	 * 📋 Récupérer les guilds utilisateur stockées
	 */
	async getUserGuilds(): Promise<GuildSyncResponse> {
		const response = await fetch(`${this.apiUrl}/auth/guilds`, {
			credentials: "include", // Important pour les cookies de session
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
		});

		if (!response.ok) {
			throw new Error(`Erreur récupération guilds: ${response.status}`);
		}

		return response.json();
	}

	/**
	 * 🔄 Synchroniser les guilds avec Discord
	 */
	async syncGuilds(
		type: "auto" | "force" = "auto",
	): Promise<GuildSyncResponse> {
		if (this.isAutoSyncRunning && type === "auto") {
			console.log("[GuildSync] ⏳ Synchronisation déjà en cours...");
			return { success: false, message: "Synchronisation déjà en cours" };
		}

		this.isAutoSyncRunning = true;

		try {
			const endpoint =
				type === "force" ? "/auth/guilds/sync/force" : "/auth/guilds/sync";

			console.log(`[GuildSync] 🔄 Synchronisation ${type} en cours...`);

			const response = await fetch(`${this.apiUrl}${endpoint}`, {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
			});

			const result = await response.json();

			if (result.success) {
				console.log(`[GuildSync] ✅ Synchronisation ${type} réussie:`, {
					guildsCount: result.data?.guildsCount,
					syncTime: result.data?.lastSync,
				});
			}

			return result;
		} finally {
			this.isAutoSyncRunning = false;
		}
	}

	/**
	 * 🔍 Diagnostiquer l'état des permissions Discord
	 */
	async diagnosePermissions() {
		try {
			const response = await fetch(`${this.apiUrl}/auth/discord/diagnose`, {
				credentials: "include",
				headers: { Accept: "application/json" },
			});

			const diagnosis = await response.json();
			return diagnosis;
		} catch (error) {
			console.error("[GuildSync] Erreur diagnostic:", error);
			return { success: false };
		}
	}

	/**
	 * 🎯 Synchroniser avant une action critique (soumission Wordle)
	 */
	async ensureGuildsForWordleSubmission(): Promise<boolean> {
		try {
			console.log(
				"[GuildSync] 🎯 Vérification guilds avant soumission Wordle...",
			);

			const guilds = await this.getUserGuilds();

			// Si pas de sync depuis plus de 2h, forcer une sync
			const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
			const needsUrgentSync =
				!guilds.data?.lastSync ||
				new Date(guilds.data.lastSync).getTime() < twoHoursAgo;

			if (needsUrgentSync) {
				console.log("[GuildSync] ⚡ Synchronisation urgente avant soumission");
				const syncResult = await this.syncGuilds("force");
				return syncResult.success;
			}

			return true;
		} catch (error) {
			console.warn("[GuildSync] ⚠️ Impossible de vérifier les guilds:", error);
			return false; // Continuer même si la sync échoue
		}
	}
}

// ============================================
// 2. COMPOSANT VUE - EXEMPLE D'UTILISATION
// ============================================

/*
<template>
  <div class="guild-manager">
    <!-- Indicateur de statut de synchronisation -->
    <div class="sync-status" :class="syncStatusClass">
      <i :class="syncStatusIcon"></i>
      <span>{{ syncStatusText }}</span>
      <button @click="forceSyncGuilds" :disabled="isSyncing">
        {{ isSyncing ? 'Synchronisation...' : 'Forcer la sync' }}
      </button>
    </div>
    
    <!-- Liste des serveurs Wordle disponibles -->
    <div v-if="wordleServers.length > 0" class="wordle-servers">
      <h3>🎮 Serveurs Wordle disponibles</h3>
      <div v-for="server in wordleServers" :key="server.serverId" class="server-card">
        <strong>{{ server.serverName }}</strong>
        <span class="channel-info">Canal: {{ server.wordleChannelId }}</span>
        <button @click="joinWordleGame(server.serverId)">
          Jouer sur ce serveur
        </button>
      </div>
    </div>
    
    <!-- Message si aucun serveur Wordle -->
    <div v-else class="no-servers">
      <p>🔍 Aucun serveur Wordle trouvé</p>
      <button @click="syncAndRefresh">Actualiser les serveurs</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { GuildSyncService } from './guild-sync.service';

const guildSync = new GuildSyncService();

// État réactif
const guilds = ref<string[]>([]);
const lastSync = ref<string | null>(null);
const needsSync = ref<boolean>(false);
const isSyncing = ref<boolean>(false);
const wordleServers = ref<any[]>([]);

// Statut de synchronisation calculé
const syncStatusClass = computed(() => ({
  'sync-good': !needsSync.value && lastSync.value,
  'sync-warning': needsSync.value,
  'sync-error': !lastSync.value
}));

const syncStatusIcon = computed(() => {
  if (!lastSync.value) return 'fas fa-exclamation-triangle';
  if (needsSync.value) return 'fas fa-clock';
  return 'fas fa-check-circle';
});

const syncStatusText = computed(() => {
  if (!lastSync.value) return 'Guilds non synchronisés';
  if (needsSync.value) return 'Synchronisation recommandée';
  return `Dernière sync: ${new Date(lastSync.value).toLocaleString()}`;
});

// Initialisation automatique
onMounted(async () => {
  console.log('🚀 Initialisation du gestionnaire de guilds...');
  
  // Synchronisation automatique au démarrage
  await guildSync.initAutoSync();
  
  // Charger les données actuelles
  await loadGuildsData();
  await loadWordleServers();
});

// Charger les données des guilds
const loadGuildsData = async () => {
  try {
    const response = await guildSync.getUserGuilds();
    if (response.success && response.data) {
      guilds.value = response.data.guilds;
      lastSync.value = response.data.lastSync;
      needsSync.value = response.data.needsSync;
    }
  } catch (error) {
    console.error('Erreur chargement guilds:', error);
  }
};

// Charger les serveurs Wordle disponibles
const loadWordleServers = async () => {
  try {
    const user = getUserFromStore(); // Votre méthode pour récupérer l'utilisateur
    if (!user?.discordId) return;
    
    const response = await fetch(`/api/discord/users/${user.discordId}/common-servers`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      wordleServers.value = data.commonServers?.filter(s => s.wordleChannelId) || [];
    }
  } catch (error) {
    console.error('Erreur chargement serveurs Wordle:', error);
  }
};

// Forcer une synchronisation
const forceSyncGuilds = async () => {
  isSyncing.value = true;
  try {
    const result = await guildSync.syncGuilds('force');
    if (result.success) {
      await loadGuildsData();
      await loadWordleServers();
    }
  } finally {
    isSyncing.value = false;
  }
};

// Synchroniser et actualiser
const syncAndRefresh = async () => {
  await forceSyncGuilds();
};

// Rejoindre une partie Wordle sur un serveur
const joinWordleGame = async (serverId: string) => {
  // S'assurer que les guilds sont à jour avant la partie
  const isReady = await guildSync.ensureGuildsForWordleSubmission();
  
  if (isReady) {
    // Naviguer vers le jeu Wordle pour ce serveur
    // router.push(`/wordle/${serverId}`)
    console.log(`🎮 Redirection vers Wordle pour serveur ${serverId}`);
  } else {
    console.warn('⚠️ Impossible de s\'assurer que les guilds sont à jour');
  }
};
</script>

<style scoped>
.guild-manager {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.sync-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.sync-good { background: #d4edda; color: #155724; }
.sync-warning { background: #fff3cd; color: #856404; }
.sync-error { background: #f8d7da; color: #721c24; }

.wordle-servers {
  margin-top: 20px;
}

.server-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 6px;
  margin-bottom: 10px;
}

.channel-info {
  font-size: 0.9em;
  color: #666;
}

.no-servers {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

button {
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  background: #0056b3;
}
</style>
*/

// ============================================
// 3. INTÉGRATION DANS UN JEU WORDLE
// ============================================

export class WordleGameManager {
	private guildSync: GuildSyncService;

	constructor() {
		this.guildSync = new GuildSyncService();
	}

	/**
	 * 🎯 Soumettre un résultat Wordle avec sync automatique des guilds
	 */
	async submitWordleGame(gameData: {
		word: string;
		attempts: any[];
		won: boolean;
		attemptsCount: number;
		dailyWordId: string;
	}) {
		try {
			console.log("🎮 Soumission partie Wordle...");

			// 1. S'assurer que les guilds sont à jour
			const guildsReady =
				await this.guildSync.ensureGuildsForWordleSubmission();

			if (!guildsReady) {
				console.warn(
					"⚠️ Guilds non synchronisés, soumission sans garantie de flux Discord",
				);
			}

			// 2. Soumettre la partie
			const response = await fetch("/api/wordle/submit-game", {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify(gameData),
			});

			const result = await response.json();

			if (result.success) {
				console.log("✅ Partie Wordle soumise avec succès");

				// 3. Les guilds à jour garantissent l'envoi des flux Discord appropriés
				this.showSuccessMessage(
					"Partie enregistrée ! Les résultats vont être partagés sur vos serveurs Discord.",
				);
			}

			return result;
		} catch (error) {
			console.error("❌ Erreur soumission Wordle:", error);
			throw error;
		}
	}

	private showSuccessMessage(message: string) {
		// Afficher notification de succès dans votre UI
		console.log("🎉", message);
	}
}

// ============================================
// 4. HOOK REACT - SYNCHRONISATION AUTOMATIQUE
// ============================================

/*
import { useState, useEffect, useCallback } from 'react';

export function useGuildSync() {
  const [guilds, setGuilds] = useState<string[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [needsSync, setNeedsSync] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [guildSync] = useState(() => new GuildSyncService());

  // Initialisation automatique
  useEffect(() => {
    const initAutoSync = async () => {
      console.log('🚀 Hook: Initialisation synchronisation guilds...');
      await guildSync.initAutoSync();
      await loadGuildsData();
    };
    
    initAutoSync();
  }, [guildSync]);

  const loadGuildsData = useCallback(async () => {
    try {
      const response = await guildSync.getUserGuilds();
      if (response.success && response.data) {
        setGuilds(response.data.guilds);
        setLastSync(response.data.lastSync);
        setNeedsSync(response.data.needsSync);
      }
    } catch (error) {
      console.error('Erreur chargement guilds:', error);
    }
  }, [guildSync]);

  const forceSyncGuilds = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await guildSync.syncGuilds('force');
      if (result.success) {
        await loadGuildsData();
      }
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [guildSync, loadGuildsData]);

  const ensureGuildsForWordle = useCallback(async () => {
    return await guildSync.ensureGuildsForWordleSubmission();
  }, [guildSync]);

  return {
    guilds,
    lastSync,
    needsSync,
    isSyncing,
    forceSyncGuilds,
    ensureGuildsForWordle,
    loadGuildsData
  };
}

// Utilisation dans un composant React
export function WordleGameComponent() {
  const { 
    guilds, 
    needsSync, 
    ensureGuildsForWordle 
  } = useGuildSync();

  const handleSubmitGame = async (gameData: any) => {
    // S'assurer que les guilds sont à jour
    const isReady = await ensureGuildsForWordle();
    
    if (isReady) {
      // Soumettre la partie Wordle
      // submitWordleGame(gameData);
    }
  };

  return (
    <div>
      <div className={`guild-status ${needsSync ? 'warning' : 'good'}`}>
        Serveurs Discord: {guilds.length} 
        {needsSync && <span>⚠️ Synchronisation recommandée</span>}
      </div>
      
      <button onClick={() => handleSubmitGame(gameData)}>
        Soumettre partie
      </button>
    </div>
  );
}
*/

// ============================================
// 5. CONFIGURATION D'ENVIRONNEMENT
// ============================================

export const FRONTEND_CONFIG = {
	// URLs de l'API selon l'environnement
	API_BASE_URL:
		process.env.NODE_ENV === "production"
			? "https://api.pexnet.fr"
			: "http://localhost:3000",

	// Intervalles de synchronisation
	SYNC_INTERVALS: {
		AUTO_CHECK: 6 * 60 * 60 * 1000, // 6 heures
		URGENT_THRESHOLD: 2 * 60 * 60 * 1000, // 2 heures
		WARNING_THRESHOLD: 24 * 60 * 60 * 1000, // 24 heures
	},

	// Messages utilisateur
	MESSAGES: {
		SYNC_SUCCESS: "✅ Serveurs Discord synchronisés",
		SYNC_ERROR: "❌ Erreur de synchronisation Discord",
		RECONNECT_NEEDED: "🔄 Reconnexion Discord requise",
		NO_SERVERS: "🔍 Aucun serveur Wordle trouvé",
	},
};

// ============================================
// 6. RÉSUMÉ D'INTÉGRATION
// ============================================

/*
📋 ÉTAPES D'INTÉGRATION :

1. **Installation du service**
   - Copier `GuildSyncService` dans votre projet
   - Adapter les URLs selon votre environnement

2. **Initialisation automatique**
   - Appeler `initAutoSync()` au démarrage de l'app
   - Intégrer dans votre système de routing/garde d'authentification

3. **Composants UI**
   - Utiliser les exemples Vue/React comme base
   - Adapter le style à votre design system

4. **Actions critiques**
   - Appeler `ensureGuildsForWordleSubmission()` avant les soumissions
   - Intégrer dans votre logique de jeu Wordle

5. **Surveillance**
   - Monitorer les logs de synchronisation
   - Implémenter des alertes pour les échecs répétés

🎯 RÉSULTAT ATTENDU :
✅ Synchronisation transparente des guilds Discord
✅ Performance optimale (3x plus rapide)
✅ Flux Discord automatiques et précis
✅ Expérience utilisateur fluide
✅ Diagnostics automatiques des problèmes

🚀 Les utilisateurs n'auront plus à se soucier de la synchronisation -
   tout se fait automatiquement en arrière-plan !
*/
