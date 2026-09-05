export const checkAndAwardBadges = (totalDonations: number) => {
  const badges = [];
  if (totalDonations >= 1) badges.push('bronze');
  if (totalDonations >= 3) badges.push('silver');
  if (totalDonations >= 6) badges.push('gold');
  if (totalDonations >= 10) badges.push('platinum');
  if (totalDonations >= 25) badges.push('life_saver');
  return badges;
};
