// views/JourneysListView.tsx
import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppView } from '../types';
import { Icons } from '../components/UIComponents';

interface GuideConversation {
    id: string;
    name: string;
    createdAt: number;
    messages: any[];
    journeySteps: any[];
}

interface Props {
    conversations: GuideConversation[];
    onSelect: (id: string) => void;
    onNew: () => void;
    onRename: (id: string, name: string) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
    activeId: string | null;
}

export default function JourneysListView({ 
    conversations, 
    onSelect, 
    onNew, 
    onRename, 
    onDelete, 
    onClose,
    activeId 
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const filtered = conversations.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const startRename = (convo: GuideConversation) => {
        setEditingId(convo.id);
        setEditName(convo.name);
    };

    const saveRename = () => {
        if (editingId && editName.trim()) {
            onRename(editingId, editName.trim());
        }
        setEditingId(null);
        setEditName('');
    };

    return (
        <div className="h-full w-full bg-[#0a0a0f] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-safe pb-4 border-b border-white/10">
                <button 
                    onClick={onClose}
                    className="p-2 -ml-2 rounded-xl text-white/50 hover:text-white"
                >
                    <Icons.ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-white font-bold text-lg">Your Journeys</h1>
                <button 
                    onClick={onNew}
                    className="p-2 -mr-2 rounded-xl text-white/50 hover:text-white"
                >
                    <Icons.Plus className="w-5 h-5" />
                </button>
            </div>

            {/* Search */}
            <div className="px-5 py-4">
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                    <Icons.Search className="w-5 h-5 text-white/30" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search journeys..."
                        className="flex-1 bg-transparent text-white text-sm placeholder:text-white/40 focus:outline-none"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="text-white/30">
                            <Icons.X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-5 pb-safe">
                {/* New Journey Button */}
                <button
                    onClick={onNew}
                    className="w-full p-4 mb-4 border-2 border-dashed border-white/20 rounded-2xl text-white/50 hover:text-white hover:border-white/40 transition-all flex items-center justify-center gap-3"
                >
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        <Icons.Plus className="w-5 h-5" />
                    </div>
                    <span className="font-medium">Start New Journey</span>
                </button>

                {filtered.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                            <Icons.MessageCircle className="w-8 h-8 text-white/20" />
                        </div>
                        <p className="text-white/40 text-sm">
                            {searchQuery ? 'No journeys found' : 'No journeys yet'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map(convo => (
                            <div
                                key={convo.id}
                                className={`rounded-2xl transition-all overflow-hidden ${
                                    convo.id === activeId 
                                        ? 'bg-white/10 ring-2 ring-white/20' 
                                        : 'bg-white/5 hover:bg-white/10'
                                }`}
                            >
                                {editingId === convo.id ? (
                                    /* Editing Mode */
                                    <div className="p-4">
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/40 mb-3"
                                            autoFocus
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') saveRename();
                                                if (e.key === 'Escape') setEditingId(null);
                                            }}
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="flex-1 py-2 rounded-xl border border-white/20 text-white/60 text-sm font-medium"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={saveRename}
                                                className="flex-1 py-2 rounded-xl bg-white text-black text-sm font-bold"
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* Normal Mode */
                                    <div className="p-4 flex items-center gap-4">
                                        {/* Planet Icon */}
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center flex-shrink-0 relative">
                                            <div className="absolute inset-1 rounded-full border border-white/20" />
                                            <span className="text-white/60 text-xs font-bold">
                                                {convo.journeySteps?.length || 0}
                                            </span>
                                        </div>

                                        {/* Info */}
                                        <button
                                            onClick={() => onSelect(convo.id)}
                                            className="flex-1 text-left min-w-0"
                                        >
                                            <h3 className="text-white font-semibold text-sm truncate">
                                                {convo.name}
                                            </h3>
                                            <p className="text-white/40 text-xs mt-0.5">
                                                {convo.messages?.length || 0} messages • {new Date(convo.createdAt).toLocaleDateString()}
                                            </p>
                                        </button>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button
                                                onClick={() => startRename(convo)}
                                                className="p-2 text-white/30 hover:text-white rounded-lg hover:bg-white/10"
                                            >
                                                <Icons.Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm('Delete this journey?')) {
                                                        onDelete(convo.id);
                                                    }
                                                }}
                                                className="p-2 text-white/30 hover:text-red-400 rounded-lg hover:bg-white/10"
                                            >
                                                <Icons.Trash className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
