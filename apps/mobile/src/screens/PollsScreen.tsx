import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  question: string;
  imageUrl?: string;
  status: string;
  endsAt?: string;
  options: PollOption[];
  totalVotes: number;
  userVoteId?: string;
}

export default function PollsScreen() {
  const { user } = useAuth();
  const [polls, setPolls]     = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]     = useState('');
  const [voting, setVoting]   = useState<string | null>(null);

  function load(isRefresh = false) {
    if (!isRefresh) setLoading(true);
    setError('');
    api.get('/polls')
      .then((r) => setPolls(r.data.polls ?? r.data.items ?? r.data ?? []))
      .catch(() => setError('Could not load polls.'))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }

  useEffect(() => { load(); }, []);

  async function handleVote(pollId: string, optionId: string) {
    if (!user) return;
    setVoting(optionId);
    try {
      await api.post(`/polls/${pollId}/vote`, { optionId });
      // API returns { ok, optionId } — update local state ourselves
      setPolls((prev) => prev.map((p) => {
        if (p.id !== pollId) return p;
        const prevId = p.userVoteId;
        const newOptions = p.options.map((opt) => {
          if (opt.id === prevId && prevId !== optionId) return { ...opt, votes: Math.max(0, opt.votes - 1) };
          if (opt.id === optionId) return { ...opt, votes: opt.votes + 1 };
          return opt;
        });
        const totalDelta = prevId ? 0 : 1;
        return { ...p, userVoteId: optionId, options: newOptions, totalVotes: p.totalVotes + totalDelta };
      }));
    } catch {}
    setVoting(null);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#f8c202" /></View>;

  return (
    <FlatList
      data={polls}
      keyExtractor={(p) => p.id.toString()}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#f8c202" />}
      ListHeaderComponent={<Text style={styles.heading}>Polls</Text>}
      ListEmptyComponent={
        <View style={styles.empty}>
          {error
            ? <Text style={styles.errorText}>{error}</Text>
            : <Text style={styles.emptyText}>No active polls right now.</Text>
          }
        </View>
      }
      renderItem={({ item: poll }) => {
        const voted = !!poll.userVoteId;
        const closed = poll.status === 'CLOSED';
        const showResults = voted || closed;

        return (
          <View style={styles.card}>
            {poll.imageUrl && (
              <Image source={{ uri: poll.imageUrl }} style={styles.pollImage} contentFit="cover" />
            )}
            <Text style={styles.question}>{poll.question}</Text>

            {poll.endsAt && !closed && (
              <Text style={styles.ends}>Ends {new Date(poll.endsAt).toLocaleDateString()}</Text>
            )}
            {closed && <Text style={styles.closedBadge}>Closed</Text>}

            <View style={styles.options}>
              {(poll.options ?? []).map((opt) => {
                const pct = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
                const isVoted = opt.id === poll.userVoteId;

                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.option, isVoted && styles.optionVoted]}
                    activeOpacity={showResults ? 1 : 0.8}
                    disabled={showResults || voting !== null}
                    onPress={() => !showResults && handleVote(poll.id, opt.id)}
                  >
                    {showResults && (
                      <View style={[styles.optionBar, { width: `${pct}%` as any }]} />
                    )}
                    <Text style={[styles.optionText, isVoted && styles.optionTextVoted]} numberOfLines={2}>
                      {opt.text}
                    </Text>
                    {showResults && (
                      <Text style={styles.optionPct}>{pct}%</Text>
                    )}
                    {voting === opt.id && (
                      <ActivityIndicator size="small" color="#f8c202" style={{ marginLeft: 8 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.totalVotes}>{(poll.totalVotes ?? 0).toLocaleString()} votes</Text>
            {!user && !closed && (
              <Text style={styles.loginPrompt}>Sign in to vote</Text>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#0d0d0d', alignItems: 'center', justifyContent: 'center' },
  list: { backgroundColor: '#0d0d0d', padding: 16, paddingBottom: 32 },
  heading: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 16 },
  card: { backgroundColor: '#161616', borderRadius: 14, overflow: 'hidden', marginBottom: 16, padding: 16 },
  pollImage: { width: '100%', height: 160, borderRadius: 10, marginBottom: 12 },
  question: { color: '#fff', fontSize: 16, fontWeight: '700', lineHeight: 22, marginBottom: 8 },
  ends: { color: '#888', fontSize: 12, marginBottom: 10 },
  closedBadge: { color: '#555', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  options: { gap: 8 },
  option: {
    position: 'relative', overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1a1a1a', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#282828',
  },
  optionVoted: { borderColor: '#f8c202' },
  optionBar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(248,194,2,0.12)', borderRadius: 10 },
  optionText: { color: '#ddd', fontSize: 14, flex: 1 },
  optionTextVoted: { color: '#f8c202', fontWeight: '700' },
  optionPct: { color: '#888', fontSize: 13, fontWeight: '600', marginLeft: 8 },
  totalVotes: { color: '#555', fontSize: 12, marginTop: 10 },
  loginPrompt: { color: '#f8c202', fontSize: 12, marginTop: 6, textAlign: 'center' },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#888', fontSize: 14 },
  errorText: { color: '#f87171', fontSize: 14 },
});
