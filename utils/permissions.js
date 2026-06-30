const config = require('../config.json');

function isStaff(member) {
    if (!member) return false;

    if (config.ownerIds.includes(member.id)) return true;

    return member.roles.cache.some(role => config.staffRoleIds.includes(role.id));
}

function isOwner(userId) {
    return config.ownerIds.includes(userId);
}

module.exports = {
    isStaff,
    isOwner
};