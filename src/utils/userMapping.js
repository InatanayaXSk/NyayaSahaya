/**
 * Maps system usernames to human-readable names as requested.
 * shogun -> Sumadhva (Client)
 * advocate_smith -> Tejasvi (Lawyer)
 */
export const mapUserName = (username) => {
    if (!username) return "Unknown";
    
    const mapping = {
        "shogun": "Sumadhva",
        "advocate_smith": "Tejasvi",
        "sumadhva": "Sumadhva",
        "tejasvi": "Tejasvi"
    };
    
    return mapping[username.toLowerCase()] || username;
};

export const getUserRoleLabel = (username) => {
    const usernameLower = username?.toLowerCase();
    if (usernameLower === "shogun" || usernameLower === "sumadhva") return "Client";
    if (usernameLower === "advocate_smith" || usernameLower === "tejasvi") return "Legal Advocate";
    return "User";
};
