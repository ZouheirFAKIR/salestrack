const tiers = [1, 5, 10, 25, 50, 100, 250, 500];

const activityBadges = (category, label) =>
  tiers.map((t) => ({
    id: `${category}-${t}`,
    category,
    threshold: t,
    label: t === 1 ? `Premier ${label}` : `${t} ${label}s`,
  }));

export const badgeDefinitions = [
  ...activityBadges('appel', 'appel'),
  ...activityBadges('rdv', 'rendez-vous'),
  ...activityBadges('devis', 'devis'),
  ...activityBadges('commande', 'commande'),

  { id: 'total-1', category: 'total', threshold: 1, label: 'Première activité' },
  { id: 'total-10', category: 'total', threshold: 10, label: '10 activités' },
  { id: 'total-25', category: 'total', threshold: 25, label: '25 activités' },
  { id: 'total-50', category: 'total', threshold: 50, label: '50 activités' },
  { id: 'total-100', category: 'total', threshold: 100, label: '100 activités' },
  { id: 'total-250', category: 'total', threshold: 250, label: '250 activités' },
  { id: 'total-500', category: 'total', threshold: 500, label: '500 activités' },
  { id: 'total-1000', category: 'total', threshold: 1000, label: '1000 activités' },

  { id: 'streak-3', category: 'streak', threshold: 3, label: 'Série 3 jours' },
  { id: 'streak-7', category: 'streak', threshold: 7, label: 'Série 7 jours' },
  { id: 'streak-14', category: 'streak', threshold: 14, label: 'Série 14 jours' },
  { id: 'streak-30', category: 'streak', threshold: 30, label: 'Série 30 jours' },
  { id: 'streak-60', category: 'streak', threshold: 60, label: 'Série 60 jours' },
  { id: 'streak-100', category: 'streak', threshold: 100, label: 'Série 100 jours' },

  { id: 'target-1', category: 'target', threshold: 1, label: 'Premier objectif atteint' },
  { id: 'target-5', category: 'target', threshold: 5, label: '5 objectifs atteints' },
  { id: 'target-10', category: 'target', threshold: 10, label: '10 objectifs atteints' },
  { id: 'target-25', category: 'target', threshold: 25, label: '25 objectifs atteints' },
];

export const categoryLabels = {
  appel: 'Appels',
  rdv: 'Rendez-vous',
  devis: 'Devis',
  commande: 'Commandes',
  total: 'Activités totales',
  streak: 'Séries',
  target: 'Objectifs quotidiens',
};  