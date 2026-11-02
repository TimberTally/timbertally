// Recommendation library (ported from ForestScribe recommendations.json).
// Markup: blank line = new paragraph, "• "/"- " = bullet, **bold**, __underline__, | table | rows.
// [[if:COND]]...[[else]]...[[/if]] picks wording by state/organization; {{TOKENS}} fill from Plan Details;
// {{camelCase}} blanks are asked for when the recommendation is added.
window.REC_LIBRARY = [
 {
  "id": "lib-emerald-ash-borer-eab",
  "category": "Pests, Disease & Storm Damage",
  "title": "Emerald Ash Borer (EAB)",
  "text": "The Emerald Ash Borer (EAB), a highly destructive invasive insect native to Asia, [[if:state:KY]]is present throughout Kentucky[[else]]has spread across much of the United States[[/if]] and is causing widespread mortality of ash trees (**Fraxinus** spp.). Unfortunately, there are no practical, landscape-scale treatments to protect ash in a woodland setting. The path forward depends on your primary management goals.\n\n**If timber value is a priority:** Consider a preemptive salvage harvest of merchantable ash trees before they die and degrade in quality. Ash deteriorates rapidly after death and becomes difficult to harvest within 2–3 years of mortality. This is especially worthwhile if a harvest is already planned for the area.\n\n**If wildlife habitat is your main goal:** Dead and dying ash trees provide excellent foraging and cavity-nesting habitat for woodpeckers and other cavity-dependent species. Barring any safety hazards near trails or structures, these standing dead trees called \"snags\" can be left to decay naturally and will provide wildlife value for years.\n\n**Monitor canopy gaps:** As ash trees die and fall, newly created openings in the canopy allow increased sunlight to reach the forest floor. These gaps can quickly encourage invasive species establishment. Monitor these areas closely and treat any invasive vegetation promptly."
 },
 {
  "id": "lib-storm-damage",
  "category": "Pests, Disease & Storm Damage",
  "title": "Storm Damage",
  "text": "Recent storm events have caused damage within this stand, including broken limbs, bent stems, and uprooted trees. A systematic response addressing safety, salvage, and future health is recommended.\n\n**Safety first:** Identify and promptly remove any hazard trees or hanging broken limbs that pose a risk to homes, buildings, roads, trails, or frequently used areas. These \"widow-makers\" can fall without warning.\n\n**Salvage potential:** Assess downed or heavily damaged trees for potential timber or firewood value before they deteriorate. A consulting forester or timber buyer can help evaluate merchantability.\n\n**Future stand management:** Storm damage creates entry points for wood decay fungi and opportunistic insects. Future TSI or harvest plans should prioritize the removal of significantly damaged stems that are unlikely to recover.\n\n**Monitor resulting openings:** As with any canopy disturbance, newly opened areas are highly susceptible to invasive species colonization. Check these gaps regularly and treat invasive vegetation early."
 },
 {
  "id": "lib-drought-stress",
  "category": "Pests, Disease & Storm Damage",
  "title": "Drought Stress",
  "text": "Recent or recurring drought conditions can place significant stress on trees, particularly those growing on drier sites, south- or west-facing slopes, or shallow rocky soils. Stressed trees become more vulnerable to secondary insects (such as bark beetles) and fungal pathogens that would not normally threaten healthy trees.\n\nIn **future TSI or thinning operations**, prioritize retaining drought-tolerant species well-suited to the site conditions (e.g., oaks, hickories, black locust on dry ridges) and consider removing heavily stressed, declining, or suppressed trees that are competing with healthier individuals. Reducing competition for soil moisture can meaningfully improve the vigor and long-term survival of the remaining stand."
 },
 {
  "id": "lib-specific-pest-or-disease-concern",
  "category": "Pests, Disease & Storm Damage",
  "title": "Specific Pest or Disease Concern",
  "prompts": [
   {
    "field": "pestName",
    "label": "Pest or disease observed",
    "placeholder": "e.g. oak wilt, beech leaf disease, hickory bark beetle"
   }
  ],
  "text": "Signs consistent with {{pestName}} were observed in this area. The affected trees and the surrounding stand should be monitored closely for further spread or accelerating decline.\n\nContact [[if:state:KY]]the **Kentucky Division of Forestry (KDF)** or **UK Forestry Extension**[[else]]your **state forestry agency** or **Cooperative Extension office**[[/if]] for specific diagnosis confirmation and current management recommendations if the problem appears significant or is worsening. Early identification and intervention can prevent a localized issue from becoming a stand-wide problem."
 },
 {
  "id": "lib-general-invasive-species-control",
  "category": "Invasive Species Management",
  "title": "General Invasive Species Control",
  "prompts": [
   {
    "field": "invasiveSpecies",
    "label": "Invasive species to treat",
    "placeholder": "e.g. bush honeysuckle and autumn olive"
   }
  ],
  "text": "Treatment of {{invasiveSpecies}} should be completed as soon as feasible to prevent further spread and negative impacts to desirable regeneration and native plant communities.\n\n**Treat before major disturbances:** It is critically important to address existing invasive species **before** timber harvesting, significant TSI, or other major ground disturbances. Harvesting operations open the canopy and disturb the soil, creating ideal conditions for invasive species to rapidly expand and dominate the newly available growing space. Treating invasives first dramatically improves the success of any subsequent forest management.\n\nThis area will likely need monitoring and follow-up treatments for several years to achieve long-term control.\n\n[[if:kdf]]The **Kentucky Division of Forestry** offers a free marking service where we identify and mark undesirable invasive trees and shrubs on your property. [[/if]][[if:!kdf+service:invasive-marking]]**{{ORG_NAME}}** can identify and mark undesirable invasive trees and shrubs on your property. [[/if]]Cost-share funding through the **Environmental Quality Incentives Program (EQIP)** is often available to offset treatment costs. Contact the **Natural Resources Conservation Service (NRCS)** office in {{COUNTY}} County at {{NRCS_PHONE}} for more information."
 },
 {
  "id": "std-japanese-stiltgrass",
  "category": "Invasive Species Management",
  "title": "Japanese Stiltgrass Treatment",
  "text": "Areas heavily infested with Japanese stiltgrass should be treated to promote regeneration and limit competition. These areas should be monitored for additional spread and may require multiple treatments. I have included a guide on treating Japanese stiltgrass for your consideration."
 },
 {
  "id": "lib-tree-of-heaven-ailanthus-altissima",
  "category": "Invasive Species Management",
  "title": "Tree-of-Heaven (Ailanthus altissima)",
  "text": "Eradication of Tree-of-Heaven is a top management priority. This species is extremely aggressive, grows rapidly, produces prolific seed crops, and releases allelopathic chemicals into the soil that suppress the growth of native plants. Control requires the use of systemic herbicides that are translocated to the root system.\n\n**Do not cut without herbicide treatment:** Cutting or mowing Tree-of-Heaven without herbicide application triggers prolific root sprouting, often resulting in a worse infestation than before treatment.\n\n**For most established stems** (greater than 4 feet tall), the **hack-and-squirt method** is the most effective approach:\n\n- Use a hatchet to make evenly spaced, downward-angled cuts through the bark and into the sapwood, completely around the trunk.\n- Immediately apply **concentrated glyphosate or triclopyr amine (50–100%)** into the fresh cuts, do not allow the cuts to dry before treating.\n- Treat **between July and November** for best results, when the tree is actively moving sugars downward toward the roots.\n\n**For seedlings under 4 feet tall**, an integrated foliar spray of glyphosate (2–5%) or triclopyr amine (2–3%) applied during the growing season is effective.\n\n**Follow-up treatments are essential**, plan for at least 2–3 years of monitoring and re-treatment to exhaust the root system and deplete the seed bank."
 },
 {
  "id": "lib-royal-paulownia-paulownia-tomentosa",
  "category": "Invasive Species Management",
  "title": "Royal Paulownia (Paulownia tomentosa)",
  "text": "Control of Royal Paulownia (also called Empress Tree) is critical wherever it appears. This species grows extraordinarily fast (up to 15 feet per year) and aggressively outcompetes native vegetation, particularly in disturbed areas and canopy openings following harvest or storm damage.\n\nLike Tree-of-Heaven, systemic herbicides are required for effective control.\n\n**For larger trees**, use the **hack-and-squirt method** between July and November (same technique as described for Tree-of-Heaven above).\n\n**For saplings and pole-sized stems**, a **basal bark treatment** using **triclopyr ester (20–25%) mixed with basal oil** sprayed on the lower 12–18 inches of the stem is effective year-round. Avoid application during extreme heat or when bark is saturated with water.\n\n**Unlike Tree-of-Heaven**, cut-stump treatments are a viable option for Paulownia if the stump is cut close to the ground and immediately treated with concentrated herbicide. However, follow-up treatment of root sprouts and seedlings will still be necessary in subsequent years."
 },
 {
  "id": "lib-understory-invasive-shrubs-bush-honeysuckle-autumn-olive-pri",
  "category": "Invasive Species Management",
  "title": "Understory Invasive Shrubs (Bush Honeysuckle, Autumn Olive, Privet)",
  "text": "Dense infestations of invasive shrubs like Bush Honeysuckle, Autumn Olive, and Privet represent one of the most significant barriers to forest regeneration in {{REGION}}. These species leaf out earlier and retain leaves later than native plants, giving them a competitive advantage in capturing light. Heavy infestations effectively prevent the establishment of native tree seedlings.\n\n**For heavy, dense infestations:** Forestry mulching or broadcast foliar spraying using a **2–5% glyphosate or triclopyr amine solution** in late summer or fall (when most native plants are dormant or dormancy has begun) is typically required to achieve meaningful control across large areas.\n\n**For scattered individual bushes:** A **cut-stump treatment** is highly effective and minimizes off-target herbicide exposure. Cut the stem as close to the ground as possible and immediately apply **concentrated glyphosate (50–100%)** to the outer cambium ring of the freshly cut stump. Speed is critical - treat within minutes of cutting.\n\n**For smaller saplings:** A **basal bark treatment** with triclopyr ester (20–25%) applied to the lower 12–18 inches of the stem can be performed year-round and is efficient for treating scattered individuals without cutting.\n\nAll invasive shrub treatments will require **monitoring and follow-up for several years** to address resprouts and new seedling establishment from the existing seed bank."
 },
 {
  "id": "lib-herbicide-application-methods-quick-reference",
  "category": "Invasive Species Management",
  "title": "Herbicide Application Methods: Quick Reference",
  "text": "Understanding the appropriate herbicide application method is critical for both effectiveness and safety. Different target species, stem sizes, and site conditions call for different approaches. The table below provides a general guide. **Always read and follow all herbicide label instructions, the label is the law. Always use appropriate Personal Protective Equipment (PPE).**\n\n| Method | Best Used For | Herbicide & Mix | Timing |\n| --- | --- | --- | --- |\n| Foliar Spray | Seedlings and low shrubs (e.g., Honeysuckle) under 4 ft tall | 2–5% solution of glyphosate or triclopyr amine in water with surfactant | July-November (actively growing) |\n| Basal Bark | Smooth-barked stems under 6 inches diameter (e.g., Autumn Olive, young Paulownia) | 20–25% triclopyr ester mixed with basal oil/diesel | Year-round (avoid extreme heat or wet bark) |\n| Cut-Stump | Most hardwood shrubs and vines (e.g., Privet, Grapevine). (not for Tree-of-Heaven) | 50–100% concentrated glyphosate or triclopyr amine | Immediately after cutting (late summer/fall optimal) |\n| Hack-and-Squirt | Larger trees (e.g., mature Tree-of-Heaven) | 50–100% concentrated glyphosate or triclopyr amine | July-November |"
 },
 {
  "id": "lib-crop-tree-release-tsi",
  "category": "Timber Stand Improvement (TSI)",
  "title": "Crop Tree Release TSI",
  "text": "This area would benefit from a **crop tree release Timber Stand Improvement (TSI)** practice. The goal of this practice is to identify the most desirable native trees on the site (called \"crop trees\") and free them from direct crown competition so they can grow faster and develop better form.\n\nCrop trees are selected based on species quality, tree form, and health. Competing trees selected for removal are typically those with damaged, diseased, forked, or otherwise defective crowns, or those of lower commercial or wildlife value. Generally, the **2 to 4 trees whose crowns are directly touching or overhanging the crop tree** are removed or killed.\n\n[[if:kdf]]**The Kentucky Division of Forestry offers a free TSI marking service** to help identify crop trees and competitors on your property. [[/if]][[if:!kdf+service:tsi-marking]]**{{ORG_NAME}} can mark crop trees and their competitors** on your property. [[/if]]Cost-share funding is often available through **EQIP**; contact your local NRCS office to learn more."
 },
 {
  "id": "lib-oak-regeneration-release",
  "category": "Timber Stand Improvement (TSI)",
  "title": "Oak Regeneration Release",
  "aliases": [
   "lib-oak-and-hickory-regeneration-release"
  ],
  "prompts": [
   {
    "field": "competingSpecies",
    "label": "Competing species suppressing the oak",
    "placeholder": "e.g. red maple, American beech, elm"
   }
  ],
  "text": "This stand contains promising **advanced oak regeneration**, seedlings and saplings that have already established on the forest floor, that is currently being suppressed by competing species such as {{competingSpecies}}. This advanced regeneration represents years of natural investment, and releasing it now is critical to ensuring oak recruits into the main canopy.\n\nA crop tree release TSI is **highly recommended** here, specifically targeting the removal or deadening of competitors growing directly above and around these desirable oak stems. Without intervention, the competing species will continue to suppress the oaks, and the window for successful recruitment may be lost."
 },
 {
  "id": "lib-stand-rehabilitation-after-poor-past-harvesting",
  "category": "Timber Stand Improvement (TSI)",
  "title": "Stand Rehabilitation after Poor Past Harvesting",
  "prompts": [
   {
    "field": "standIssues",
    "label": "What the stand is now dominated by",
    "placeholder": "e.g. cull trees and low-value species such as red maple and beech"
   }
  ],
  "text": "Past harvesting practices, including **diameter-limit cutting or high-grading** (the practice of removing only the largest and highest-value trees while leaving all others), have resulted in a stand dominated by {{standIssues}}. Rehabilitating a high-graded stand is a long-term commitment, but meaningful improvement is achievable with deliberate management.\n\n**Step 1: Control invasive species:** Before any other work, address invasive plant infestations. TSI and harvest disturbance will only amplify invasive pressure if not treated first.\n\n**Step 2: Implement TSI:** Focus on removing the poorest-quality residual trees (cull stems, heavily defective trees) to release any remaining trees with structural or species potential.\n\n**Step 3: Evaluate regeneration:** If natural regeneration of desirable species like oak is inadequate in the canopy gaps created by TSI, evaluate the feasibility of underplanting native seedlings in strategic areas.\n\nThis is generational work, and realistic expectations combined with a written long-term management plan are valuable tools for staying on course."
 },
 {
  "id": "lib-midstory-competition-suppressing-oak-regeneration",
  "category": "Timber Stand Improvement (TSI)",
  "title": "Midstory Competition Suppressing Oak Regeneration",
  "prompts": [
   {
    "field": "midstoryLayer",
    "label": "Canopy layer affected",
    "placeholder": "e.g. midstory",
    "default": "midstory"
   },
   {
    "field": "midstorySpecies",
    "label": "Midstory / competing species",
    "placeholder": "e.g. American beech, red and sugar maple"
   }
  ],
  "text": "This stand is significantly impacted by a dense {{midstoryLayer}} of {{midstorySpecies}}. These shade-tolerant species are highly effective at intercepting light and suppressing the regeneration of more light-demanding, commercially valuable species like oak.\n\n**If a harvest is planned in the near future:** Consider implementing a **midstory removal treatment 5–10 years prior to the planned harvest**. Removing the midstory competition in advance creates a \"pre-harvest\" light environment that allows advanced oak regeneration to establish on the forest floor before the final harvest removes the overstory.\n\n**For general stand improvement without an imminent harvest:** Implement TSI to chemically control these native competitors where they are most directly crowding existing desirable timber trees. Hack-and-squirt or basal bark treatments (see herbicide methods table) are the most practical approaches for standing midstory trees."
 },
 {
  "id": "lib-wild-grapevine-control",
  "category": "Timber Stand Improvement (TSI)",
  "title": "Wild Grapevine Control",
  "text": "Wild grapevines (primarily **Vitis** spp.) are a significant and often overlooked threat to timber quality. Vines climb into the crowns of young and developing trees, adding weight that leads to crown breakage during ice and wind events, reducing the vigor of the host tree, and producing forked, low-value stem form. Heavy grapevine loading is one of the most common causes of preventable timber value loss in [[if:state:KY]]Kentucky woodlands[[else]]hardwood woodlands[[/if]].\n\n**Before any timber harvesting or major TSI**, grapevines should be severed at or near ground level using a hand saw, loppers, or machete. This kills the vine in the crown while leaving the root system in place, which is a far more practical approach than trying to remove the vines from the tree.\n\n**If cutting in late summer or fall:** Immediately treat the freshly cut stump with concentrated glyphosate or triclopyr to prevent resprouting.\n\n**If cutting in spring or early summer:** Herbicide treatment is generally not needed, as shading from the intact canopy will typically suppress sprouting from the cut stump during the growing season."
 },
 {
  "id": "lib-light-tsi-thinning",
  "category": "Timber Stand Improvement (TSI)",
  "title": "Light TSI Thinning",
  "text": "This area would benefit from a light Timber Stand Improvement (TSI) thinning. Rather than a comprehensive crop tree release across the entire stand, this lighter treatment involves identifying and killing or felling a select number of cull, diseased, or defective trees that are **directly competing with adjacent, better-quality potential crop trees**.\n\nEven removing a small number of key competitors (as few as 3–5 per acre in the right locations) can measurably improve the vigor, crown development, and diameter growth rate of the targeted crop trees over time.\n\nWhile this lighter treatment may not meet the minimum intensity requirements for **cost-share programs like EQIP**, it is still highly beneficial for long-term stand value and is a practical starting point for landowners new to active management."
 },
 {
  "id": "lib-post-harvest-tsi",
  "category": "Timber Stand Improvement (TSI)",
  "title": "Post-Harvest TSI",
  "text": "Timber Stand Improvement is **highly recommended following any harvest**, and timing is critical. Post-harvest TSI should be completed **within one to two years** of logging operations, before dense new briars, blackberry thickets, and brush make the work physically impractical and significantly more expensive. Otherwise you will need to wait 10+ years for the canopy to close and shade out much of the midstory vegetation before management becomes practical again.\n\nPost-harvest TSI should focus on three primary tasks:\n\n- **Deadening cull trees** left standing after logging that were not merchantable but continue to compete with desirable regeneration.\n- **Severing grapevines** that are competing with or threatening newly established desirable seedlings and sprouts.\n- **Completing regeneration openings** by removing remaining undesirable shade-tolerant stems (e.g., beech or maple sprouts) that would otherwise suppress the new forest layer."
 },
 {
  "id": "std-continue-post-harvest-tsi",
  "category": "Timber Stand Improvement (TSI)",
  "title": "Continue Post-Harvest TSI / Release Regeneration",
  "for": "forested",
  "text": "Portions of this area have received post-harvest mid-story removal of the residual non hard mast producing species. This appears to be developing well and I recommend continuing the post-harvest timber stand improvement work releasing the desired regeneration where possible."
 },
 {
  "id": "lib-pre-harvest-midstory-removal-for-oak-regeneration",
  "category": "Timber Stand Improvement (TSI)",
  "title": "Pre-Harvest Mid-Story Removal for Oak Regeneration",
  "for": "forested",
  "aliases": [
   "std-preharvest-midstory"
  ],
  "prompts": [
   {
    "field": "midstoryRemovalSpp",
    "label": "Midstory competitor species",
    "placeholder": "e.g. red maple, sugar maple, American beech",
    "default": "maple and beech"
   }
  ],
  "text": "To improve the likelihood of successfully regenerating oak in this stand, a **pre-harvest mid-story removal** is recommended approximately **5 to 10 years before the planned final harvest**. This stand has mature oaks in the overstory but lacks sufficient advanced oak regeneration (seedlings and saplings over 4.5 feet tall) in the understory, while having a dense midstory of shade-tolerant competitors such as {{midstoryRemovalSpp}}.\n\nThis treatment involves selectively killing or removing these midstory competitors with herbicide (hack-and-squirt or basal bark) or by cutting. More sunlight then reaches the forest floor, promoting the establishment and growth of oak seedlings from acorns produced by the overstory trees. When the final harvest takes place, this advanced oak regeneration is already established and positioned to compete with faster-growing species.\n\nWithout this preparation, a harvest that opens the canopy will most commonly regenerate to a dense stand of maple, beech, or yellow-poplar rather than oak, an outcome that is very difficult to reverse."
 },
 {
  "id": "std-eqip-cost-share",
  "category": "Timber Stand Improvement (TSI)",
  "title": "EQIP Cost Share",
  "text": "Cost share funding is often available to complete these types of TSI practices through the Environmental Quality Incentives Program (EQIP). You can contact the Natural Resources Conservation Service office in {{COUNTY}} County at {{NRCS_PHONE}} for more information on eligibility."
 },
 {
  "id": "lib-timber-developing-well-no-harvest-recommended",
  "category": "Stand Development & Maturity",
  "title": "Timber Developing Well: No Harvest at This Time",
  "for": "forested",
  "aliases": [
   "std-allow-grow-no-harvest"
  ],
  "text": "The timber in this area is developing well and shows no signs of significant health decline, widespread pest or disease pressure, or growth stagnation. While some trees may be approaching merchantable size, a commercial harvest is **not recommended at this time**.\n\nAllowing the stand to continue growing until a majority of the timber reaches the medium (18-23\" DBH) and large (24\"+ DBH) sawtimber size classes will significantly increase the overall merchantable volume, per-tree value, and total financial return at the time of harvest. Harvesting timber before it reaches these sizes is one of the most common ways landowners leave money on the table.\n\nReevaluate this area's condition and market potential every 10 years to determine the appropriate timing for a future selective harvest or other management actions."
 },
 {
  "id": "lib-allow-to-grow-reevaluate-in-10-years",
  "category": "Stand Development & Maturity",
  "title": "Allow to Grow and Mature: Reevaluate in 10 Years",
  "for": "forested",
  "aliases": [
   "std-allow-grow-reevaluate"
  ],
  "text": "This area should primarily be allowed to grow and mature naturally at this time. The timber is mostly poletimber sized and generally of fair to good quality, but requires additional time to reach merchantable size and value. The trees have not yet fully occupied the available growing space, and natural competition is still effectively shaping the stand; a harvest or intensive TSI now would remove trees before they reach their full growth potential and value.\n\n**This area should be reevaluated by a forester in approximately 10 years** to assess its development and determine future management needs. In the meantime, continue periodic monitoring for invasive species, particularly along woodland edges, trails, and stream corridors where invasives commonly enter, and treat any infestations promptly while they are small and manageable."
 },
 {
  "id": "lib-eastern-redcedar-old-field-succession",
  "category": "Stand Development & Maturity",
  "title": "Eastern Redcedar: Natural Transition to Hardwoods",
  "for": "forested",
  "aliases": [
   "std-cedar-succession"
  ],
  "text": "This area is predominantly eastern redcedar, which is typical of old-field succession on former pasture or cropland in {{REGION}}. Redcedar is a native pioneer species that colonizes open ground rapidly in the absence of fire or mowing.\n\nNo active management is required at this time. If left undisturbed, the hardwood species present in the understory will eventually overtop the cedar, and over the coming decades the stand will gradually transition towards a mixed hardwood stand.\n\nIf speeding up this transition is a goal, or if the cedar has merchantable value, a harvest that removes the cedar canopy will release the hardwood regeneration and jump-start the change to a hardwood forest."
 },
 {
  "id": "lib-developing-stand-allow-5-10-more-years-before-tsi",
  "category": "Stand Development & Maturity",
  "title": "Developing Stand: Allow 5–10 More Years Before TSI",
  "text": "This stand would likely benefit from a thinning or TSI practice in the near future, but the trees have not yet reached a size or density where treatment would be most effective or cost-efficient. Implementing TSI too early in stand development can be less impactful than waiting until competition stress becomes more clearly expressed.\n\n**Allow the stand to develop for another 5–10 years**, then have a forester reevaluate it. At that point, crop trees should be more clearly identifiable, and a TSI treatment will have a more lasting and meaningful impact on stand trajectory."
 },
 {
  "id": "std-selective-harvest-tsi",
  "category": "Harvest & Regeneration",
  "title": "Selective Harvest with Post-Harvest TSI",
  "for": "forested",
  "text": "This area is developing well with little to no signs of decline and can be left to grow if desired. Alternately this area contains mature timber and is suitable for a selective harvest if desired. A professionally marked selective harvest should be conducted, targeting trees that are biologically mature or over-mature, showing signs of decline, disease, or significant damage, and trees of lower quality or undesirable species competing with higher-value crop trees.\n\nThe harvest should aim to maintain appropriate stand density, release promising future crop trees, improve overall stand health and composition, and generate income. A well-executed selective harvest will leave a residual stand with a varied size class distribution and sufficient high-quality trees for future growth and harvests (typically planned 20-30 years later). Post-harvest TSI is highly recommended.\n\nTimber stand improvement (TSI) is highly recommended following a harvest, ideally completed within one to two years before dense new growth makes the work impractical. TSI should focus on:\n• Killing or felling cull trees (poor quality, damaged, diseased) left after logging.\n• Cutting grapevines competing with desirable regeneration or residual trees.\n• Completing regeneration openings by removing any remaining undesirable stems (e.g., non-merchantable beech/maple) that could suppress the developing desirable seedlings and sprouts.\n\nThis follow-up work is crucial for maximizing the growth of valuable regeneration and residual trees, improving the overall timber quality of the next stand, and fully realizing the benefits of the harvest."
 },
 {
  "id": "lib-improvement-harvest",
  "category": "Harvest & Regeneration",
  "title": "Improvement Harvest",
  "text": "This area contains mature timber that is suitable for an **improvement harvest**, a professionally designed and marked harvest intended to improve overall stand health and composition, not simply to generate maximum short-term revenue.\n\nA professionally marked harvest should target:\n\n- Trees that are biologically over-mature or showing clear signs of decline, disease, or structural failure\n- Trees of lower quality, form, or species value that are directly competing with higher-value crop trees\n- Trees that, when removed, will release the crowns of superior residual trees and accelerate their growth\n\nThe goal is to improve stand density, release future crop trees, and enhance long-term stand health, not simply to harvest the easiest or largest trees available.\n\n**Crucially, invasive species should be treated prior to any harvest equipment entering the woods** to prevent their rapid spread into disturbed soils and newly opened canopy gaps."
 },
 {
  "id": "lib-shelterwood-harvest-system-for-oak-regeneration",
  "category": "Harvest & Regeneration",
  "title": "Shelterwood Harvest System for Oak Regeneration",
  "text": "To successfully regenerate oak and other heavy-seeded, light-demanding species, a **shelterwood harvest system** is recommended for this area. Unlike a clearcut (which removes the entire overstory at once) or a selection harvest (which removes individual trees), the shelterwood is a deliberate, multi-step process designed to create the specific light conditions needed for oak regeneration.\n\n**Step 1: The Establishment Cut:** The first harvest removes approximately 40–60% of the overstory volume, primarily targeting lower-quality species and less desirable trees, while retaining the best quality oaks and other valuable species as a \"shelter.\" This increases light to the forest floor enough to stimulate the establishment of oak and other desirable seedlings.\n\n**Step 2: Monitor Advanced Regeneration:** After the establishment cut, monitor the understory over 5–10 years. The goal is to achieve a dense, well-established layer of desirable seedlings (advance regeneration) before the final removal.\n\n**Step 3: The Removal Cut:** Once adequate advanced regeneration has established and grown to sufficient height (typically knee- to waist-high), the remaining overstory trees are harvested, releasing the new forest into full sunlight.\n\nThis system requires patience and multiple entries over a 10–20 year period, but it is the most reliable method for regenerating high-quality, oak-dominated stands in {{REGION}}."
 },
 {
  "id": "lib-harvest-of-eastern-redcedar-or-virginia-pine",
  "category": "Harvest & Regeneration",
  "title": "Harvest Merchantable Eastern Redcedar / Pine",
  "aliases": [
   "std-cedar-harvest"
  ],
  "prompts": [
   {
    "field": "coniferSpecies",
    "label": "Species to harvest",
    "placeholder": "e.g. eastern redcedar and Virginia pine",
    "default": "eastern redcedar"
   }
  ],
  "text": "The volume of merchantable {{coniferSpecies}} in this area is likely enough to attract an interested timber buyer and, if desired, it can be harvested. The evergreen canopy heavily shades the forest floor, limiting the establishment of hardwood seedlings. Harvesting will:\n• Utilize the existing merchantable timber value.\n• Increase the sunlight reaching the forest floor.\n• Release existing hardwood regeneration or create conditions favorable for establishing new hardwood seedlings.\n• Accelerate the natural transition to a hardwood-dominated forest.\n\nFollowing the harvest, monitor the opening for invasive species and consider supplemental planting of native hardwood seedlings if natural regeneration is inadequate."
 },
 {
  "id": "lib-clearcut-regeneration-harvest",
  "category": "Harvest & Regeneration",
  "title": "Clearcut Regeneration Harvest",
  "prompts": [
   {
    "field": "clearcutReason",
    "label": "Reason for the clearcut",
    "placeholder": "e.g. poor species composition and widespread low quality"
   }
  ],
  "text": "Due to {{clearcutReason}}, a regeneration harvest using the **clearcut method** is recommended for this area.\n\nA clearcut involves the removal of all merchantable stems within the designated area, creating a large opening that allows a new, even-aged forest stand to develop in full sunlight. This method is most appropriate when the existing overstory has little or no value worth retaining, or when the target regeneration species (such as oak or yellow-poplar) require maximum light to compete effectively.\n\n**Post-harvest follow-through is critical:** Following the harvest, all remaining non-merchantable trees (typically greater than 2\" DBH) of undesirable species must be **felled or killed using herbicide**. Leaving these residual stems standing will allow them to suppress the new regeneration with shade before it can become established, which is a costly and common failure point in clearcut regeneration.\n\n**Treat invasive species before harvest equipment enters** to prevent rapid expansion into disturbed areas."
 },
 {
  "id": "lib-timber-marking-and-sale-preparation",
  "category": "Harvest & Regeneration",
  "title": "Timber Marking and Sale Preparation",
  "text": "When a harvest is desired, trees designated for cutting should be **marked by a qualified forester** prior to contacting any timber buyers. [[if:kdf]]The Kentucky Division of Forestry offers timber marking for a fee of **$10 per MBF** (thousand board feet) marked, with a **minimum of $100**. To request a marking and tallying agreement, please contact the branch office at {{OFFICE_PHONE}}. [[/if]][[if:!kdf+service:marking]]{{ORG_NAME}} offers timber marking{{MARKING_FEE_TEXT}}. To request marking, please contact our office at {{OFFICE_PHONE}}. [[/if]]Properly marked timber sales protect you legally, ensure only intended trees are cut, and allow an accurate volume estimate for negotiating with buyers.\n\n**Marked trees receive two paint spots**, placed one at eye level on the stem and one below the anticipated stump height. Species, diameter at breast height (DBH), and estimated merchantable height are recorded for each marked tree to generate a volume estimate.\n\nYou will receive a summary report detailing the marked trees, estimated volume by species and product class, a list of potential timber buyers in your region, and a sample timber sale contract. **Only marked trees should be cut**; this should be clearly stated in any timber sale agreement."
 },
 {
  "id": "lib-competitive-bid-timber-sales-and-contracts",
  "category": "Harvest & Regeneration",
  "title": "Competitive Bid Timber Sales and Contracts",
  "text": "To maximize your financial return and protect your property, **always sell marked timber through a sealed competitive bid process**. Accepting the first offer from a single buyer, even a familiar one, routinely results in significantly below-market returns. Advertising the sale widely and requiring sealed bids from multiple buyers is the most reliable way to ensure you receive fair market value.\n\n[[if:kdf]]**KDF can provide a list of potential timber buyers** in your region to assist with advertising the sale.[[/if]][[if:!kdf+service:buyer-list]]**{{ORG_SHORT}} can provide a list of potential timber buyers** in your region to assist with advertising the sale.[[/if]]\n\n**Always use a written timber sale contract** that clearly defines the trees to be cut, the sale price and payment terms, the sale duration, road and landing specifications, required liability insurance, and a requirement for adherence to {{STATE_POSS}} **Best Management Practices (BMPs)** for water quality protection.\n\nFor comprehensive assistance preparing, advertising, and administering the sale from start to finish, consider hiring a **private consulting forester**. Their fee is typically more than offset by the increased revenue and protection a professionally managed sale provides."
 },
 {
  "id": "std-nonforest-maintain",
  "category": "Tree Planting & Site Restoration",
  "title": "Non-Forested: Maintain as Desired / Tree Planting",
  "for": "nonforested",
  "text": "This area can be maintained as you see fit. Please contact me at {{OFFICE_PHONE}} if you are interested in planting a portion of this area in trees."
 },
 {
  "id": "lib-tree-planting-recommendations",
  "category": "Tree Planting & Site Restoration",
  "title": "Tree Planting Recommendations",
  "text": "Planting trees in open areas can dramatically accelerate forest establishment, but successful survival and growth depends on careful planning and consistent follow-through during the establishment period. Plantings that skip site preparation or post-planting maintenance have poor survival rates.\n\n**Site preparation is essential:** Competing vegetation, especially tall fescue, which releases allelopathic compounds that inhibit tree seedling growth, must be controlled before planting. Herbicide treatment of fescue the summer or fall prior to planting is strongly recommended.\n\n**Species selection:**\n\n- **For timber goals:** Favor oaks (white, red, chestnut, swamp white), black walnut, and yellow-poplar based on site conditions.\n- **For wildlife goals:** Favor a mix of hard mast producers (oaks, hickory) and soft mast producers (persimmon, native plum, flowering dogwood, serviceberry).\n- **Match species to site:** Consult a forester to match species selection to your specific soil type, moisture regime, and aspect.\n\n**Planting logistics:**\n\n- Order bare-root seedlings early (summer or fall) from [[if:state:KY]]the **KDF State Nursery**[[else]]your **state forestry nursery**[[/if]] or reputable private vendors, as popular species sell out quickly.\n- Plant during the dormant season (**January through April**), ensuring the root collar is set flush with the ground surface. Do not J-root or plant too deep.\n- Common spacings: **10 x 10 ft (436 trees/acre)** for more open canopy development, or **8 x 8 ft (680 trees/acre)** for higher stocking and more competition to promote straight stem development.\n\n**Post-planting weed control is mandatory:** Competing vegetation must be managed for **2 to 5 years** until the trees are tall enough to overtop surrounding weeds. This is the most commonly neglected step and the primary cause of planting failures.\n\nCost-share funding through **EQIP** is often available for both planting and site preparation. Contact your local NRCS office to learn more."
 },
 {
  "id": "lib-example-tree-planting-timeline",
  "category": "Tree Planting & Site Restoration",
  "title": "Example Tree Planting Timeline",
  "text": "The following is a practical timeline for establishing a tree planting in a fescue-dominated open field:\n\n**Late Summer/Fall (August-November): Prior to Planting Year:**\n\n- Mow the fescue field to stimulate a fresh flush of growth.\n- Allow regrowth to reach 4–6 inches, then strip-spray the planned tree rows with an appropriate herbicide (glyphosate is commonly used) to kill the fescue in a band where your trees will be planted.\n- Order your seedlings if you have not already done so.\n\n**Dormant Season (January-April): Planting Year:**\n\n- Plant bare-root seedlings within the deadened herbicide strips at the recommended spacing.\n- Optionally, broadcast seed clover between tree rows (February-April) to suppress weed competition, fix nitrogen, and provide early wildlife benefit.\n\n**Spring/Summer: Year 1:**\n\n- Approximately 4–6 weeks after planting, spot-spray areas of grass and weeds within the tree rows. If spraying near seedlings, use a grass-specific herbicide (such as fluazifop or clethodim) to avoid injuring broadleaf seedlings.\n- Mow lanes between tree rows throughout the growing season to manage competition and maintain access.\n\n**Years 2–3:**\n\n- Continue spot-spraying competing vegetation within the rows and mowing between rows until seedlings have clearly overtopped surrounding vegetation.\n\n**Year 4 and Beyond:**\n\n- Once trees are established and taller than surrounding competition, mow between rows only once every two years for access and aesthetics as desired."
 },
 {
  "id": "lib-livestock-exclusion-from-woodlands",
  "category": "Property Infrastructure & Water Quality",
  "title": "Livestock Exclusion from Woodlands",
  "text": "Woodlands must be protected from livestock grazing. Unrestricted livestock access to forested areas causes extensive, long-term damage that is often irreversible without significant intervention:\n\n- Hoof traffic **compacts soil**, reducing water infiltration, root growth, and the soil's ability to support tree growth over time.\n- Livestock **browse and trample** desirable tree seedlings and regeneration, effectively preventing forest renewal and creating conditions favorable for invasive species.\n- Streambank grazing **destabilizes banks**, dramatically increases erosion and sedimentation into waterways, and degrades water quality and aquatic habitat.\n\n**Fencing to exclude livestock from forest and riparian areas is required** to allow recovery. Cost-share assistance for fencing materials and installation may be available through NRCS/EQIP."
 },
 {
  "id": "lib-access-lanes-and-firebreaks",
  "category": "Property Infrastructure & Water Quality",
  "title": "Access Lanes and Firebreaks",
  "text": "Well-planned and properly maintained access lanes and firebreaks are foundational infrastructure for effective property management. They provide access for timber harvesting equipment, TSI crews, recreational use, monitoring, and fire suppression response, and are far cheaper to build correctly than to repair after erosion has set in.\n\n**Route planning:** Follow natural land contours as closely as possible. Avoid grades steeper than 15% and minimize crossings of wet areas, streams, and wetlands. The best roads require the least maintenance.\n\n**Width and clearing:** Maintain a cleared width of 10–14 feet, keeping the lane free of overhanging limbs and flammable vegetation. A slightly wider brushed clearing on each side reduces the risk of storm damage from falling limbs.\n\n**Erosion control:** Install water bars or broad-based dips on all sloped sections to divert runoff off the road surface before it concentrates and causes gullying. Seed all disturbed areas with an appropriate ground cover (avoid fescue in areas adjacent to woodlands)."
 },
 {
  "id": "lib-streamside-management-zones-smz",
  "category": "Property Infrastructure & Water Quality",
  "title": "Streamside Management Zone (SMZ)",
  "aliases": [
   "std-smz"
  ],
  "text": "Maintain a protected, vegetated buffer called a **Streamside Management Zone (SMZ)** along streams, rivers, lakes and ponds. The SMZ protects water quality, stabilizes the banks, filters sediment and nutrients, and provides aquatic habitat and travel corridors for wildlife.[[if:state:KY]]\n\nThe Kentucky Forest Practice Guidelines for Water Quality Management set these SMZs:\n• Along perennial streams and perennial water bodies, keep at least **50% of the original overstory trees** within **25 feet** of the bank on slopes under 15%, and within **50 feet** on slopes of 15% or more.\n• Keep roads, skid trails and log landings at least **50 feet** from perennial and intermittent streams and water bodies on slopes under 15%, and **100 feet** on slopes of 15% or more, except at designated stream crossings.\n• Along streams designated as coldwater aquatic habitat, keep **75% of the original overstory trees**, keep roads, trails and landings at least **100 feet** away regardless of slope, and disturb the understory as little as possible.[[else]]\n\nFollow {{BMP_GUIDE}} for the SMZ width along each kind of stream and for how many trees to keep in it. Keep roads, skid trails and log landings out of the SMZ except at designated stream crossings.[[/if]]\n\nWhen harvesting near streams, avoid significant soil disturbance in the SMZ, fell trees away from the water, and keep tops and logging debris out of the stream channel."
 },
 {
  "id": "lib-trail-planning-and-construction",
  "category": "Property Infrastructure & Water Quality",
  "title": "Trail Planning and Construction",
  "text": "Well-planned trails can greatly enhance the recreational enjoyment and management access of your property while minimizing long-term environmental impact. Poorly located or constructed trails are a leading source of erosion and stream sedimentation on private lands.\n\n**Route planning:** Follow natural contours and avoid steep grades greater than 15% wherever possible. Route trails away from wet soils, seeps, and stream crossings. Where crossings are unavoidable, use appropriate structures (culverts, bridges, or armored fords).\n\n**Construction:** Clear only the minimum vegetation necessary for the trail width. Minimize soil disturbance and exposed mineral soil. Outslope the trail tread slightly (2–5%) so surface water drains off the trail rather than running down it. Install water bars on all sloped sections to intercept and redirect runoff.\n\n**Ongoing maintenance:** Periodically inspect all drainage structures, especially after major storm events, and address erosion issues promptly before minor problems become major ones."
 },
 {
  "id": "lib-edge-feathering-for-wildlife-cover",
  "category": "Wildlife Habitat Management",
  "title": "Edge Feathering for Wildlife Cover",
  "text": "Abrupt, hard-edged transitions between forest and open fields are poor quality habitat for most wildlife species. The dense, shrubby, layered \"edge habitat\" that develops in transitional zones is critical cover for species like Northern Bobwhite Quail, Eastern Cottontail Rabbit, American Woodcock, and numerous neotropical migratory songbirds.\n\nTo improve edge habitat quality, implement **edge feathering** along forest borders:\n\n- Cut, hinge, or drop less desirable trees along the first **30 to 50 feet** of the forest border, working inward from the field edge.\n- Allow felled and hinge-cut trees to lay where they fall, creating an immediate tangle of downed wood and brush that provides escape cover and nest sites.\n- Over the following 2–5 years, this disturbed zone will develop dense growth of native shrubs, brambles, and seedling trees, providing exactly the layered brushy cover that high-quality edge species require.\n\nEdge feathering can be performed with a chainsaw, and targeted herbicide treatment of invasive shrubs during this process can ensure the developing edge cover is dominated by native species."
 },
 {
  "id": "lib-high-value-tree-pruning",
  "category": "Wildlife Habitat Management",
  "title": "High-Value Tree Pruning",
  "text": "Pruning the lower branches of selected high-value crop trees is a deliberate investment in future timber quality. The primary goal is to develop a **clear, knot-free lower log**, which is the most valuable portion of any hardwood tree, by removing side branches before they grow large enough to create significant knots in the developing wood.\n\nPruning is most worthwhile on high-value species growing in plantation or open-grown settings, particularly **Black Walnut, Oak, and Black Cherry**. These species can command significant premium prices for clear lumber, and even modest pruning can substantially increase individual tree value.\n\n**Target pruning height:** The goal is to clear the lower 10–17 feet of the stem (the first one to two 8-foot logs), which captures the most valuable wood.\n\n**Timing and technique:** Prune during the dormant season, on trees less than 8\" DBH before branches become large. Always use proper technique, including the 3-cut method for larger limbs to prevent bark tearing, and never remove more than one-third of the live crown in a single pruning event."
 },
 {
  "id": "lib-general-wildlife-habitat-recommendations",
  "category": "Wildlife Habitat Management",
  "title": "General Wildlife Habitat Recommendations",
  "text": "To broadly benefit wildlife across your property, the following practices can be integrated into any management plan:\n\n- **Retain snags and cavity trees:** During any cutting operation, retain a minimum of 2–5 standing dead trees (snags) and live trees containing cavities per acre. These features are irreplaceable nesting and foraging habitat for woodpeckers, owls, bats, and many small mammals.\n- **Maintain mast diversity:** Favor retention and regeneration of hard mast producers (oaks, hickory, beech) and soft mast producers (wild cherry, persimmon, native dogwoods) to provide year-round food sources for diverse wildlife.\n- **Develop brushy edges:** Maintain soft, structurally diverse transitions between forest and open areas.\n- **Create small canopy gaps:** intentional openings in continuous forest canopy.\n\nFor targeted, site-specific habitat recommendations tailored to your property and management goals, contact your [[if:state:KY]]**KDFWR Private Lands Biologist**[[else]]**state wildlife agency's private lands biologist**[[/if]]. This free service can significantly improve the wildlife value of your management decisions."
 },
 {
  "id": "lib-native-warm-season-grasses-and-wildflowers",
  "category": "Wildlife Habitat Management",
  "title": "Native Warm-Season Grasses and Wildflowers",
  "text": "Converting non-native grass fields, particularly those dominated by **tall fescue**, an invasive cool-season grass from Europe, to native warm-season grasses and wildflowers is one of the highest-impact habitat improvements available to {{STATE_NAME}} landowners. Native warm-season grass stands provide dramatically superior nesting, brood-rearing, and foraging habitat for Northern Bobwhite Quail, Wild Turkey, pollinators, and many grassland-dependent songbirds.\n\n**Target species for establishment:** Big bluestem, Indiangrass, and switchgrass for grass structure, combined with native forbs (wildflowers) such as partridge pea, native sunflowers, and coneflowers.\n\n**Establishment requires thorough site preparation:** Existing fescue must be killed, typically requiring multiple herbicide applications over one to two growing seasons, before native seeding will succeed. Attempting to seed into living fescue almost always fails.\n\n**Long-term maintenance requires periodic disturbance:** Native warm-season grass stands require disturbance every 1–3 years to remain in optimal condition and prevent woody encroachment. Options include:\n\n- Prescribed burning (most effective)\n- Strip disking (disking portions of the stand on a rotating basis)\n- Rotational mowing: mow high (8–12 inches minimum), and **always outside the May 15 – July 15 nesting season** to avoid destroying ground nests"
 },
 {
  "id": "lib-cedar-glades-and-prairie-remnants",
  "category": "Wildlife Habitat Management",
  "title": "Cedar Glades and Prairie Remnants",
  "aliases": [
   "std-cedar-glade-thinning"
  ],
  "text": "This area has the potential to contain **cedar glade or prairie remnant** species and, if desired, would benefit from a thinning. Cedar glades and prairie remnants, typically rocky, shallow-soil sites with native grasses and wildflowers, are rare natural communities in {{STATE_NAME}} that support plants and animals found in few other places on the landscape.\n\nWhere these communities are present, actively manage to maintain or expand the open or semi-open conditions by selectively removing or killing encroaching woody species (especially eastern redcedar, pine, and undesirable hardwoods) by cutting, girdling, or herbicide treatment. Periodic prescribed fire is an effective long-term maintenance tool. The goal is to increase the sunlight reaching the ground to promote the native herbaceous plant community and the wildlife it supports (e.g., quail, turkey poults, and pollinators).\n\nFor site-specific guidance, contact [[if:state:KY]]**UK Forestry Extension** or the **Office of Kentucky Nature Preserves**[[else]]your **Cooperative Extension office** or your **state natural heritage program**[[/if]]."
 },
 {
  "id": "lib-creating-small-canopy-gaps-for-structural-diversity",
  "category": "Wildlife Habitat Management",
  "title": "Creating Small Canopy Gaps for Structural Diversity",
  "text": "Continuous, closed-canopy forest with limited structural diversity provides relatively poor wildlife habitat compared to forests with varied age classes, light levels, and vegetation layers. Creating small, intentional canopy openings is a simple and effective way to improve structural diversity and stimulate regeneration without committing to a full harvest.\n\n**Gap creation technique:** Fell or kill (via herbicide) groups of low-quality, defective, or undesirable trees to create openings of approximately one-quarter to one-half acre in size. This scale mimics the natural disturbance footprint of a small windthrow event, which is within the scale that oak and other desirable species can regenerate successfully.\n\nThese gaps immediately stimulate dense understory growth, including native shrubs, vines, brambles, and tree seedlings, providing critical browse, nesting cover, and foraging habitat for deer, turkey, rabbits, and songbirds. The regenerating trees in the gap will eventually grow into the canopy, creating a distinct age class that adds long-term structural diversity to the stand."
 },
 {
  "id": "lib-prescribed-fire",
  "category": "Wildlife Habitat Management",
  "title": "Prescribed Fire",
  "text": "Prescribed fire is one of the most powerful and ecologically appropriate tools available for managing {{STATE_POSS}} forests, woodlands, and native grasslands. Used strategically, fire can restore fire-dependent oak woodland ecosystems, set back invasive shrub competition, stimulate native warm-season grass and forb regeneration, and reduce accumulated fuel loads that increase wildfire risk.\n\nHowever, the effectiveness and safety of prescribed fire depends entirely on proper preparation and execution. Conducting a safe and legal prescribed burn in {{STATE_NAME}} requires:\n\nSpecific training in fire behavior, suppression, and burn management\n\nA detailed, written burn plan covering objectives, prescription weather windows, ignition patterns, and contingencies\n\nFull compliance with [[if:state:KY]]KDF[[else]]state and local[[/if]] open burning laws and permit requirements\n\nAn adequately trained and equipped crew present on the ground during the burn\n\nIf you are interested in incorporating prescribed fire into your land management, [[if:state:KY]]attend a \"Learn to Burn\" workshop offered through the Kentucky Division of Forestry, or consult the Kentucky Prescribed Fire Council (searchable online)[[else]]attend a prescribed fire training workshop offered by your state forestry agency or Extension, or contact your state or regional prescribed fire council (searchable online)[[/if]] to connect with experienced practitioners in your region."
 },
 {
  "id": "lib-non-timber-forest-products-ntfps",
  "category": "Additional Management Considerations",
  "title": "Non-Timber Forest Products (NTFPs)",
  "text": "{{STATE_POSS}} forests support a diverse array of Non-Timber Forest Products (NTFPs) with potential economic or personal value, including:\n\nMedicinal herbs: American ginseng (Panax quinquefolius), goldenseal, black cohosh, and ramps are all native to {{STATE_POSS}} forests and have established markets.\n\nEdible mushrooms: Shiitake (cultivated on oak logs), morel, and chicken-of-the-woods mushrooms can be sustainably harvested or cultivated.\n\nMaple syrup: Sugar maple and black maple stands in appropriate locations can support small-scale syrup production.\n\nSuccessful NTFP development requires understanding site-specific habitat requirements, sustainable harvest rates, cultivation techniques, and current markets. Always be aware of legal regulations, particularly for wild-harvested species like American ginseng, which is regulated by both state and federal law due to its status as a commercially exploited native species. [[if:state:KY]]Contact UK Forestry Extension for current resources on NTFP development and markets in Kentucky.[[else]]Contact your Cooperative Extension office for current resources on NTFP development and markets in your area.[[/if]]"
 },
 {
  "id": "lib-long-term-stewardship-and-estate-planning",
  "category": "Additional Management Considerations",
  "title": "Long-Term Stewardship and Estate Planning",
  "text": "Forest management is inherently a long-term investment, and meaningful outcomes often unfold over decades. The full benefits of today's decisions may not be realized within a single generation. This reality makes it especially important to think deliberately about your long-term vision for the property and to communicate that vision clearly.\n\nStart the conversation with family: Discuss your stewardship goals, the management work you have invested in, and your intentions for the property with family members or potential heirs. A thoughtful conversation now can prevent costly misunderstandings or unintended sales later.\n\nExplore estate planning tools that can help ensure the property remains intact and managed according to your wishes:\n\nWills and trusts: Ensure clear transfer of the property to intended heirs with explicit guidance on management intent.\n\nConservation easements: A voluntary legal agreement with a land trust or government agency that permanently restricts development while typically providing significant tax benefits to the landowner. Easements can be tailored to allow continued timber management, hunting, and other uses.\n\nLand trusts: Organizations that specialize in protecting land in perpetuity and can assist with both easements and direct purchase.\n\nA local land trust (the Land Trust Alliance lists them by state at landtrustalliance.org/land-trusts) and [[if:state:KY]]the UK Cooperative Extension Service[[else]]your Cooperative Extension office[[/if]] are good starting points for exploring your options."
 },
 {
  "id": "lib-periodic-property-monitoring",
  "category": "Additional Management Considerations",
  "title": "Periodic Property Monitoring",
  "text": "One of the simplest and most cost-effective management practices available to any woodland owner is periodic, systematic observation of your own property. Forest conditions are constantly changing, and early detection of emerging problems is almost always significantly less costly to address than problems that have been allowed to establish and spread.\n\nWalk your property at least once or twice per year with the specific intent of observing forest conditions, not just for recreation. During these monitoring walks, look for:\n\nStorm damage: New blowdowns, broken tops, or leaning trees that may create hazards or salvage opportunities\n\nInsect and disease signs: Unusual crown dieback, bark discoloration, exit holes, cankers, or other symptoms you have not observed before; photograph and report unusual findings to [[if:state:KY]]KDF or UK Extension[[else]]your state forestry agency or Extension office[[/if]]\n\nNew invasive species: Small, new infestations along woodland edges, trails, stream corridors, and old roads are far easier and cheaper to address than established populations\n\nRegeneration status: Are desired species recruiting successfully? Are areas you treated previously recovering as expected?\n\nKeep a simple written or photographic record of your observations over time. This record will be invaluable in tracking change, informing future management decisions, and demonstrating stewardship history for cost-share programs or conservation easement applications."
 }
];
