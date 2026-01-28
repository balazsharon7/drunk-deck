'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { Language } from '@/lib/game-types';
import Image from 'next/image';
import {
  ArrowLeft,
  LogOut,
  User,
  Users,
  UserPlus,
  Check,
  X,
  Search,
  Trash2,
  Settings,
  Camera,
  MessageCircle,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileScreenProps {
  onBack: () => void;
  onLogout: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  userId: string;
}

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
}

interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted';
  profiles?: Profile;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  sender?: Profile;
}

export function ProfileScreen({ onBack, onLogout, language, setLanguage, userId }: ProfileScreenProps) {
  const [view, setView] = useState<'profile' | 'friends' | 'add-friend' | 'messages' | 'chat'>('profile');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Profile | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  useEffect(() => {
    loadProfile();
    loadFriends();
    loadMessages();
  }, [userId]);

  // Subscribe to new messages
  useEffect(() => {
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`
        },
        () => {
          loadMessages();
          if (selectedFriend) {
            loadChatMessages(selectedFriend.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, selectedFriend]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url, language')
      .eq('id', userId)
      .single();

    if (data) {
      setUsername(data.username);
      setAvatarUrl(data.avatar_url);
      if (data.language) {
        setLanguage(data.language as Language);
      }
    }
  };

  const loadFriends = async () => {
    // Load accepted friends
    const { data: acceptedFriends } = await supabase
      .from('friendships')
      .select(`
        id,
        user_id,
        friend_id,
        status,
        profiles:friend_id (
          id,
          username,
          avatar_url
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'accepted');

    // Also load where I'm the friend
    const { data: reverseFriends } = await supabase
      .from('friendships')
      .select(`
        id,
        user_id,
        friend_id,
        status,
        profiles:user_id (
          id,
          username,
          avatar_url
        )
      `)
      .eq('friend_id', userId)
      .eq('status', 'accepted');

    setFriends([...(acceptedFriends || []), ...(reverseFriends || [])]);

    // Load pending requests
    const { data: pending } = await supabase
      .from('friendships')
      .select(`
        id,
        user_id,
        friend_id,
        status,
        profiles:user_id (
          id,
          username,
          avatar_url
        )
      `)
      .eq('friend_id', userId)
      .eq('status', 'pending');

    setPendingRequests(pending || []);
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        receiver_id,
        message,
        created_at,
        sender:profiles!messages_sender_id_fkey (
          id,
          username,
          avatar_url
        )
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    setMessages(data || []);
  };

  const loadChatMessages = async (friendId: string) => {
    const { data } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        receiver_id,
        message,
        created_at,
        sender:profiles!messages_sender_id_fkey (
          id,
          username,
          avatar_url
        )
      `)
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true });

    setChatMessages(data || []);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert(language === 'hu' ? 'A fájl túl nagy! Maximum 2MB.' : 'File too large! Maximum 2MB.');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      alert(language === 'hu' ? 'Profilkép feltöltve!' : 'Avatar uploaded!');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      alert(language === 'hu' ? 'Hiba a feltöltés során' : 'Error uploading avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateLanguage = async (newLang: Language) => {
    await supabase
      .from('profiles')
      .update({ language: newLang })
      .eq('id', userId);

    setLanguage(newLang);
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .ilike('username', `%${searchQuery}%`)
      .neq('id', userId)
      .limit(10);

    setSearchResults(data || []);
    setLoading(false);
  };

  const handleSendFriendRequest = async (friendId: string) => {
    const { data: existing } = await supabase
      .from('friendships')
      .select()
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
      .single();

    if (existing) {
      alert(language === 'hu' ? 'Már ismerősök vagytok vagy van függő kérés!' : 'Already friends or request pending!');
      return;
    }

    await supabase
      .from('friendships')
      .insert({
        user_id: userId,
        friend_id: friendId,
        status: 'pending'
      });

    setSearchQuery('');
    setSearchResults([]);
    alert(language === 'hu' ? 'Ismerőskérés elküldve!' : 'Friend request sent!');
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);

    await loadFriends();
  };

  const handleRejectRequest = async (friendshipId: string) => {
    await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    await loadFriends();
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    if (!confirm(language === 'hu' ? 'Biztosan törlöd ezt az ismerőst?' : 'Remove this friend?')) {
      return;
    }

    await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    await loadFriends();
  };

  const handleOpenChat = (friend: Profile) => {
    setSelectedFriend(friend);
    loadChatMessages(friend.id);
    setView('chat');
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedFriend) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: userId,
        receiver_id: selectedFriend.id,
        message: newMessage.trim()
      });

    if (!error) {
      setNewMessage('');
      await loadChatMessages(selectedFriend.id);
    }
  };

  // Profile view
  if (view === 'profile') {
    return (
      <div className="min-h-screen bg-black flex flex-col safe-area-top safe-area-bottom">
        <header className="flex items-center justify-between p-4 border-b-2 border-gold/30">
          <Button variant="ghost" onClick={onBack} className="text-gold gap-1 hover:bg-gold/10">
            <ArrowLeft className="w-4 h-4" />
            {language === 'hu' ? 'Vissza' : 'Back'}
          </Button>
          <h1 className="text-lg font-bold text-golden">
            {language === 'hu' ? 'Profil' : 'Profile'}
          </h1>
          <div className="w-16" />
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-md mx-auto space-y-6">
            {/* Avatar and username */}
            <div className="text-center">
              <div className="relative w-32 h-32 mx-auto mb-4">
                <div className="w-full h-full rounded-full border-4 border-gold overflow-hidden bg-gradient-to-br from-gold/20 to-transparent">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={username}
                      width={128}
                      height={128}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                      <User className="w-16 h-16 text-gold" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-gold text-black flex items-center justify-center border-4 border-black hover:scale-110 transition-transform disabled:opacity-50"
                >
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">{username}</h2>
              <Badge className="bg-gold/20 text-gold border-gold/30">
                {language === 'hu' ? 'Aktív felhasználó' : 'Active user'}
              </Badge>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => setView('friends')}
                className="luxury-card w-full p-4 rounded-xl hover:scale-105 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-gold" />
                  <span className="font-semibold text-white">
                    {language === 'hu' ? 'Ismerősök' : 'Friends'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {pendingRequests.length > 0 && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                      {pendingRequests.length}
                    </Badge>
                  )}
                  <span className="text-gold font-bold">{friends.length}</span>
                </div>
              </button>

              <button
                onClick={() => setView('messages')}
                className="luxury-card w-full p-4 rounded-xl hover:scale-105 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-5 h-5 text-gold" />
                  <span className="font-semibold text-white">
                    {language === 'hu' ? 'Üzenetek' : 'Messages'}
                  </span>
                </div>
                <span className="text-gold font-bold">{messages.length}</span>
              </button>
            </div>

            {/* Language settings */}
            <div className="luxury-card p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-5 h-5 text-gold" />
                <Label className="text-base font-semibold text-white">
                  {language === 'hu' ? 'Nyelv' : 'Language'}
                </Label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateLanguage('hu')}
                  className={cn(
                    'flex-1 py-2 px-4 rounded-lg font-medium transition-all',
                    language === 'hu'
                      ? 'bg-gold text-black'
                      : 'bg-zinc-900 border border-gold/30 text-gold hover:border-gold'
                  )}
                >
                  🇭🇺 Magyar
                </button>
                <button
                  onClick={() => handleUpdateLanguage('en')}
                  className={cn(
                    'flex-1 py-2 px-4 rounded-lg font-medium transition-all',
                    language === 'en'
                      ? 'bg-gold text-black'
                      : 'bg-zinc-900 border border-gold/30 text-gold hover:border-gold'
                  )}
                >
                  🇬🇧 English
                </button>
              </div>
            </div>

            {/* Logout button */}
            <Button
              onClick={onLogout}
              variant="outline"
              className="w-full h-12 bg-transparent border-2 border-red-500 text-red-400 hover:bg-red-500/10 gap-2"
            >
              <LogOut className="w-5 h-5" />
              {language === 'hu' ? 'Kijelentkezés' : 'Logout'}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Friends view
  if (view === 'friends') {
    return (
      <div className="min-h-screen bg-black flex flex-col safe-area-top safe-area-bottom">
        <header className="flex items-center justify-between p-4 border-b-2 border-gold/30">
          <Button variant="ghost" onClick={() => setView('profile')} className="text-gold gap-1 hover:bg-gold/10">
            <ArrowLeft className="w-4 h-4" />
            {language === 'hu' ? 'Vissza' : 'Back'}
          </Button>
          <h1 className="text-lg font-bold text-golden">
            {language === 'hu' ? 'Ismerősök' : 'Friends'}
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setView('add-friend')}
            className="text-gold hover:bg-gold/10"
          >
            <UserPlus className="w-5 h-5" />
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-md mx-auto space-y-6">
            {/* Pending requests */}
            {pendingRequests.length > 0 && (
              <div>
                <Label className="mb-3 flex items-center gap-2 text-gold">
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    {pendingRequests.length}
                  </Badge>
                  {language === 'hu' ? 'Függő kérések' : 'Pending requests'}
                </Label>
                <div className="space-y-2">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="luxury-card flex items-center justify-between p-3 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border-2 border-gold overflow-hidden bg-zinc-900 flex items-center justify-center">
                          {request.profiles?.avatar_url ? (
                            <Image
                              src={request.profiles.avatar_url}
                              alt={request.profiles.username || ''}
                              width={40}
                              height={40}
                              className="object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-gold" />
                          )}
                        </div>
                        <span className="font-semibold text-white">
                          {request.profiles?.username || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleAcceptRequest(request.id)}
                          className="text-green-400 hover:text-green-300 hover:bg-green-500/10 h-8 w-8"
                        >
                          <Check className="w-5 h-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRejectRequest(request.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8"
                        >
                          <X className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friends list */}
            <div>
              <Label className="mb-3 text-gold">
                {language === 'hu' ? 'Ismerősök' : 'Friends'} ({friends.length})
              </Label>
              {friends.length === 0 ? (
                <div className="text-center py-8 luxury-card rounded-xl p-6">
                  <Users className="w-12 h-12 text-gold mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">
                    {language === 'hu' ? 'Még nincs ismerősöd' : 'No friends yet'}
                  </p>
                  <Button
                    variant="ghost"
                    onClick={() => setView('add-friend')}
                    className="mt-3 text-gold gap-2 hover:bg-gold/10"
                  >
                    <UserPlus className="w-4 h-4" />
                    {language === 'hu' ? 'Ismerős hozzáadása' : 'Add friend'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((friend) => {
                    const friendProfile = friend.profiles;
                    return (
                      <div
                        key={friend.id}
                        className="luxury-card flex items-center justify-between p-3 rounded-xl"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 rounded-full border-2 border-gold overflow-hidden bg-zinc-900 flex items-center justify-center">
                            {friendProfile?.avatar_url ? (
                              <Image
                                src={friendProfile.avatar_url}
                                alt={friendProfile.username || ''}
                                width={40}
                                height={40}
                                className="object-cover"
                              />
                            ) : (
                              <User className="w-5 h-5 text-gold" />
                            )}
                          </div>
                          <span className="font-semibold text-white">
                            {friendProfile?.username || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => friendProfile && handleOpenChat(friendProfile)}
                            className="text-gold hover:text-gold/80 hover:bg-gold/10 h-8 w-8"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveFriend(friend.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Add friend view
  if (view === 'add-friend') {
    return (
      <div className="min-h-screen bg-black flex flex-col safe-area-top safe-area-bottom">
        <header className="flex items-center justify-between p-4 border-b-2 border-gold/30">
          <Button variant="ghost" onClick={() => setView('friends')} className="text-gold gap-1 hover:bg-gold/10">
            <ArrowLeft className="w-4 h-4" />
            {language === 'hu' ? 'Vissza' : 'Back'}
          </Button>
          <h1 className="text-lg font-bold text-golden">
            {language === 'hu' ? 'Ismerős keresése' : 'Find friends'}
          </h1>
          <div className="w-16" />
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-md mx-auto space-y-6">
            {/* Search */}
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                placeholder={language === 'hu' ? 'Keress felhasználónév alapján...' : 'Search by username...'}
                className="flex-1 bg-zinc-900 border-gold/30 text-white placeholder:text-gray-500"
              />
              <Button
                onClick={handleSearchUsers}
                disabled={loading || !searchQuery.trim()}
                className="luxury-button px-6"
              >
                <Search className="w-5 h-5" />
              </Button>
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div>
                <Label className="mb-3 text-gold">
                  {language === 'hu' ? 'Találatok' : 'Results'}
                </Label>
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="luxury-card flex items-center justify-between p-3 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border-2 border-gold overflow-hidden bg-zinc-900 flex items-center justify-center">
                          {user.avatar_url ? (
                            <Image
                              src={user.avatar_url}
                              alt={user.username}
                              width={40}
                              height={40}
                              className="object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-gold" />
                          )}
                        </div>
                        <span className="font-semibold text-white">{user.username}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSendFriendRequest(user.id)}
                        className="text-gold hover:text-gold/80 hover:bg-gold/10 gap-1"
                      >
                        <UserPlus className="w-4 h-4" />
                        {language === 'hu' ? 'Hozzáadás' : 'Add'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchQuery.trim() && searchResults.length === 0 && !loading && (
              <div className="text-center py-8 luxury-card rounded-xl p-6">
                <p className="text-muted-foreground">
                  {language === 'hu' ? 'Nincs találat' : 'No results'}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Messages view
  if (view === 'messages') {
    // Group messages by friend
    const messagesByFriend = messages.reduce((acc, msg) => {
      const friendId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      if (!acc[friendId]) {
        acc[friendId] = [];
      }
      acc[friendId].push(msg);
      return acc;
    }, {} as { [key: string]: Message[] });

    return (
      <div className="min-h-screen bg-black flex flex-col safe-area-top safe-area-bottom">
        <header className="flex items-center justify-between p-4 border-b-2 border-gold/30">
          <Button variant="ghost" onClick={() => setView('profile')} className="text-gold gap-1 hover:bg-gold/10">
            <ArrowLeft className="w-4 h-4" />
            {language === 'hu' ? 'Vissza' : 'Back'}
          </Button>
          <h1 className="text-lg font-bold text-golden">
            {language === 'hu' ? 'Üzenetek' : 'Messages'}
          </h1>
          <div className="w-16" />
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-md mx-auto space-y-2">
            {Object.entries(messagesByFriend).map(([friendId, msgs]) => {
              const lastMsg = msgs[0];
              const friend = lastMsg.sender_id === userId ? { id: friendId } : lastMsg.sender;
              
              return (
                <button
                  key={friendId}
                  onClick={() => friend && handleOpenChat(friend as Profile)}
                  className="luxury-card w-full p-4 rounded-xl hover:scale-105 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-2 border-gold overflow-hidden bg-zinc-900 flex items-center justify-center">
                      {friend && 'avatar_url' in friend && friend.avatar_url ? (
                        <Image
                          src={friend.avatar_url}
                          alt={friend.username || ''}
                          width={48}
                          height={48}
                          className="object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-gold" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white">
                        {friend && 'username' in friend ? friend.username : 'Unknown'}
                      </p>
                      <p className="text-sm text-gray-400 truncate">
                        {lastMsg.message}
                      </p>
                    </div>
                    <MessageCircle className="w-5 h-5 text-gold" />
                  </div>
                </button>
              );
            })}

            {Object.keys(messagesByFriend).length === 0 && (
              <div className="text-center py-8 luxury-card rounded-xl p-6">
                <MessageCircle className="w-12 h-12 text-gold mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">
                  {language === 'hu' ? 'Nincs még üzeneted' : 'No messages yet'}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Chat view
  if (view === 'chat' && selectedFriend) {
    return (
      <div className="min-h-screen bg-black flex flex-col safe-area-top safe-area-bottom">
        <header className="flex items-center justify-between p-4 border-b-2 border-gold/30">
          <Button variant="ghost" onClick={() => setView('messages')} className="text-gold gap-1 hover:bg-gold/10">
            <ArrowLeft className="w-4 h-4" />
            {language === 'hu' ? 'Vissza' : 'Back'}
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-gold overflow-hidden bg-zinc-900 flex items-center justify-center">
              {selectedFriend.avatar_url ? (
                <Image
                  src={selectedFriend.avatar_url}
                  alt={selectedFriend.username}
                  width={32}
                  height={32}
                  className="object-cover"
                />
              ) : (
                <User className="w-4 h-4 text-gold" />
              )}
            </div>
            <h1 className="text-lg font-bold text-golden">{selectedFriend.username}</h1>
          </div>
          <div className="w-16" />
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-md mx-auto space-y-3">
            {chatMessages.map((msg) => {
              const isMe = msg.sender_id === userId;
              return (
                <div
                  key={msg.id}
                  className={cn('flex', isMe ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[75%] p-3 rounded-2xl',
                      isMe
                        ? 'bg-gold text-black rounded-br-sm'
                        : 'luxury-card text-white rounded-bl-sm'
                    )}
                  >
                    <p className="text-sm">{msg.message}</p>
                    <p className={cn('text-xs mt-1', isMe ? 'text-black/60' : 'text-gray-400')}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        <div className="p-4 border-t-2 border-gold/30">
          <div className="flex gap-2 max-w-md mx-auto">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={language === 'hu' ? 'Írj üzenetet...' : 'Type a message...'}
              className="flex-1 bg-zinc-900 border-gold/30 text-white placeholder:text-gray-500"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="luxury-button px-6"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
