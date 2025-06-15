import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { type Member } from '../vote-verification';
import { addAlias as addVoteAlias } from '../vote-verification';

export interface Alias {
  vanId: string;
  alias: string;
}

export function useAliases(onAliasChange: () => void) {
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prefilledAlias, setPrefilledAlias] = useState('');

  // Load aliases from cookies on initial load
  useEffect(() => {
    const savedAliases = Cookies.get('aliases');
    if (savedAliases) {
      try {
        const parsedAliases = JSON.parse(savedAliases);
        setAliases(parsedAliases);
        // Apply saved aliases to the vote verification system
        parsedAliases.forEach((alias: Alias) => {
          addVoteAlias(alias.vanId, alias.alias);
        });
      } catch (e) {
        console.error('Error parsing aliases from cookies:', e);
      }
    }
  }, []);

  // Save aliases to cookies whenever they change
  useEffect(() => {
    Cookies.set('aliases', JSON.stringify(aliases), { expires: 365 }); // Expires in 1 year
  }, [aliases]);

  const createAlias = (member: Member, aliasName: string) => {
    const newAlias: Alias = { vanId: member.vanId, alias: aliasName };
    setAliases(prev => [...prev, newAlias]);
    addVoteAlias(member.vanId, aliasName);
    onAliasChange();
  };

  const resetAliases = () => {
    setAliases([]);
    Cookies.remove('aliases');
    onAliasChange();
  };

  const openAliasModal = (prefill: string = '') => {
    setPrefilledAlias(prefill);
    setIsModalOpen(true);
  };

  const closeAliasModal = () => {
    setIsModalOpen(false);
    setPrefilledAlias('');
  };

  return {
    aliases,
    isModalOpen,
    prefilledAlias,
    createAlias,
    resetAliases,
    openAliasModal,
    closeAliasModal
  };
}
