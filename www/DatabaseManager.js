/* 
 * PROJECT: AQUA MATCH PUZZLE
 * DEVELOPER: Emad Ibrahim
 * STUDIO: NexApp Development Studio
 * COPYRIGHT: © 2026 NexApp. All Rights Reserved.
 */

import { init, id } from "@instantdb/core";
import { INSTANT_DB_APP_ID } from "./instant_db_config.js";

class DatabaseManager {
    constructor() {
        this.db = init({ appId: INSTANT_DB_APP_ID });
        this.userId = this.getOrCreateUserId();
        this.playerName = localStorage.getItem('aqua_match_player_name') || 'Diver_' + this.userId.slice(0, 4);
        
        // Load local state
        const savedFriends = localStorage.getItem('aqua_match_friends');
        this.friends = savedFriends ? JSON.parse(savedFriends) : [];
        
        const savedRequests = localStorage.getItem('aqua_match_incoming_requests');
        this.incomingRequests = savedRequests ? JSON.parse(savedRequests) : [];

        // Initial sync
        this.syncProfile();
    }

    getOrCreateUserId() {
        let userId = localStorage.getItem('aqua_match_user_id');
        if (!userId) {
            userId = id();
            localStorage.setItem('aqua_match_user_id', userId);
        }
        return userId;
    }

    setPlayerName(name) {
        this.playerName = name;
        localStorage.setItem('aqua_match_player_name', name);
        this.syncProfile();
    }

    sendFriendRequest(targetUserId) {
        // In this simulation, we'll "send" by updating the target's incomingRequests 
        // Note: In a real app, you'd need the target's current data or a cloud function.
        // For this demo, we'll just transact a placeholder update.
        this.db.transact([
            this.db.tx.players[targetUserId].update({
                hasNewRequest: true
            })
        ]);
    }

    addFriend(friendId) {
        if (!this.friends.includes(friendId) && friendId !== this.userId) {
            this.friends.push(friendId);
            localStorage.setItem('aqua_match_friends', JSON.stringify(this.friends));
            this.syncProfile();
            return true;
        }
        return false;
    }

    acceptRequest(senderId) {
        this.incomingRequests = this.incomingRequests.filter(id => id !== senderId);
        this.addFriend(senderId);
        localStorage.setItem('aqua_match_incoming_requests', JSON.stringify(this.incomingRequests));
        this.syncProfile();
    }

    declineRequest(senderId) {
        this.incomingRequests = this.incomingRequests.filter(id => id !== senderId);
        localStorage.setItem('aqua_match_incoming_requests', JSON.stringify(this.incomingRequests));
        this.syncProfile();
    }

    removeFriend(friendId) {
        this.friends = this.friends.filter(id => id !== friendId);
        localStorage.setItem('aqua_match_friends', JSON.stringify(this.friends));
        this.syncProfile();
    }

    syncProfile() {
        // We use a flat structure for leaders
        this.db.transact([
            this.db.tx.players[this.userId].update({
                name: this.playerName,
                lastSeen: Date.now(),
                friends: this.friends,
                incomingRequests: this.incomingRequests
            })
        ]);
    }

    updateScore(totalStars, totalScore, missionsCompleted = 0, levelStats = null, collectedSpecies = null, abyssDepth = 0, pearlsContributed = 0) {
        const updateData = {
            stars: totalStars,
            totalScore: totalScore,
            missionsCompleted: missionsCompleted,
            abyssDepth: abyssDepth,
            pearlsContributed: pearlsContributed,
            lastUpdate: Date.now()
        };
        
        // Also sync level stats if provided
        if (levelStats) {
            updateData.levelStats = JSON.stringify(levelStats);
        }

        if (collectedSpecies) {
            updateData.collectedSpecies = Array.from(collectedSpecies);
        }

        this.db.transact([
            this.db.tx.players[this.userId].update(updateData)
        ]);
    }

    subscribeToLeaderboard(callback, sortBy = 'stars') {
        return this.db.subscribeQuery({ players: {} }, (result) => {
            if (result.data && result.data.players) {
                const sorted = [...result.data.players].sort((a, b) => {
                    if (sortBy === 'abyssDepth') {
                        if ((b.abyssDepth || 0) !== (a.abyssDepth || 0)) {
                            return (b.abyssDepth || 0) - (a.abyssDepth || 0);
                        }
                        return (b.totalScore || 0) - (a.totalScore || 0);
                    } else if (sortBy === 'missionsCompleted') {
                        if ((b.missionsCompleted || 0) !== (a.missionsCompleted || 0)) {
                            return (b.missionsCompleted || 0) - (a.missionsCompleted || 0);
                        }
                        return (b.stars || 0) - (a.stars || 0);
                    } else {
                        // Default: Sort by stars descending, then totalScore descending
                        if ((b.stars || 0) !== (a.stars || 0)) {
                            return (b.stars || 0) - (a.stars || 0);
                        }
                        return (b.totalScore || 0) - (a.totalScore || 0);
                    }
                });
                callback(sorted);
            }
        });
    }
}

export const dbManager = new DatabaseManager();
