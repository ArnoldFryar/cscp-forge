export type ModuleSuggestedPracticeQuiz = {
  moduleId: string;
  length: 10 | 25 | 50;
  difficulty: "easy" | "medium" | "hard" | "all";
  mode: "study" | "exam" | "weak-area";
  label: string;
};

export type ModuleFramework = {
  title: string;
  summary: string;
  steps: string[];
};

export type ModuleNote = {
  moduleId: string;
  moduleName: string;
  overview: string;
  whyItMatters: string;
  keyConcepts: string[];
  keyTerms: Array<{ term: string; definition: string }>;
  frameworks: ModuleFramework[];
  commonExamTraps: string[];
  manufacturingExample: string;
  planningExample: string;
  logisticsOrSupplierExample: string;
  quickRecallPrompts: string[];
  recommendedQuizFocus: string[];
  plantManagerSummary: string;
  suggestedPracticeQuiz: ModuleSuggestedPracticeQuiz;
};

export const moduleNotes: ModuleNote[] = [
  {
    moduleId: "m1",
    moduleName: "Supply Chain Strategy",
    overview: "Supply chain strategy is the work of translating business intent into operating choices. It connects customer promise, product characteristics, network design, sourcing posture, inventory policy, and risk appetite. On the exam, this module is less about memorizing strategy labels and more about choosing the operating model that fits the scenario.",
    whyItMatters: "In real supply chain leadership, poor strategic fit shows up as chronic expediting, inventory in the wrong place, service promises operations cannot keep, and cost programs that damage growth. Leaders use strategy to decide what the supply chain must be excellent at and what tradeoffs it will accept.",
    keyConcepts: [
      "Strategic fit between market promise and operating capability",
      "Segmentation by customer, channel, product, demand pattern, or service need",
      "Tradeoffs among service, cost, cash, resilience, speed, and flexibility",
      "End-to-end thinking across plan, source, make, deliver, return, and enable",
      "Governance that aligns commercial, finance, operations, and supplier decisions",
      "Performance measures that reinforce the intended business model",
    ],
    keyTerms: [
      { term: "Strategic fit", definition: "Alignment between business strategy, customer requirements, and supply chain capabilities." },
      { term: "Supply chain segmentation", definition: "Grouping products, customers, or flows so policies match different service, demand, and margin realities." },
      { term: "Operating model", definition: "The way people, processes, assets, data, and partners are organized to deliver the business strategy." },
      { term: "Total landed cost", definition: "The full delivered cost, including purchase price, freight, duties, inventory, handling, quality, and risk effects." },
      { term: "Risk appetite", definition: "The level of uncertainty or exposure the business is willing to accept to meet its objectives." },
      { term: "Value proposition", definition: "The promise made to the customer, such as low cost, high availability, customization, speed, or reliability." },
    ],
    frameworks: [
      {
        title: "Strategy-to-operations fit check",
        summary: "Use this to test whether a supply chain decision supports the business model instead of optimizing a single function.",
        steps: [
          "Identify the customer promise and competitive priority in the scenario.",
          "Name the operating capabilities required to deliver that promise.",
          "Check sourcing, inventory, manufacturing, logistics, and planning policies against those capabilities.",
          "Reject choices that reduce local cost while weakening the end-to-end promise.",
        ],
      },
      {
        title: "Service-cost-risk tradeoff review",
        summary: "Most strategic questions require balancing several outcomes at once.",
        steps: [
          "Clarify which outcome is most important: service, cost, cash, growth, risk, or flexibility.",
          "Estimate how each option changes the other outcomes.",
          "Watch for hidden consequences in inventory, capacity, lead time, or supplier exposure.",
          "Choose the option that best fits the stated business priority.",
        ],
      },
    ],
    commonExamTraps: [
      "Choosing the lowest-cost answer when the scenario emphasizes responsiveness, resilience, or customer service.",
      "Treating supply chain strategy as a logistics-only or procurement-only decision.",
      "Assuming one policy should apply to all customers, products, or regions.",
      "Optimizing one metric, such as inventory turns, while ignoring service or risk consequences.",
    ],
    manufacturingExample: "A plant that supports both standard replacement parts and highly customized engineered orders should not use one planning and stocking rule for both. Standard parts may use lean replenishment and stable buffers, while engineered orders need flexible capacity, design coordination, and longer lead-time promises.",
    planningExample: "A company promising high availability for critical SKUs may accept higher safety stock or regional inventory even when the finance team prefers a single central warehouse. The planning policy must match the service promise.",
    logisticsOrSupplierExample: "A premium service strategy may justify dual carriers, supplier capacity reservations, or backup lanes. A cost-leader strategy may prefer fewer nodes, consolidated freight, and stricter SKU rationalization.",
    quickRecallPrompts: [
      "What customer promise is the supply chain being asked to support?",
      "Which tradeoff is the scenario really testing: cost, service, cash, speed, or risk?",
      "When should a company segment its supply chain instead of standardizing policy?",
      "What is the difference between local efficiency and end-to-end effectiveness?",
      "How can a metric create behavior that conflicts with strategy?",
    ],
    recommendedQuizFocus: [
      "Scenario questions that ask for best strategic fit",
      "Segmentation and tradeoff questions",
      "Network or sourcing decisions tied to customer promise",
      "Questions where the cheapest answer is tempting but wrong",
    ],
    plantManagerSummary: "Do not run the plant as if every order has the same business value or service promise. Know which products need speed, which need low cost, which need flexibility, and which need protection from disruption. The right operating model makes those choices explicit instead of forcing supervisors to fight the same tradeoffs every day.",
    suggestedPracticeQuiz: {
      moduleId: "m1",
      length: 25,
      difficulty: "medium",
      mode: "study",
      label: "Module 1 strategy set",
    },
  },
  {
    moduleId: "m2",
    moduleName: "Demand and Supply Planning",
    overview: "Demand and supply planning turns market signals, supply limits, inventory targets, and financial expectations into one executable plan. This module tests whether you can read forecast behavior, recognize planning bias, balance constrained supply, and use S&OP or IBP as a decision process rather than a calendar meeting.",
    whyItMatters: "Planning quality determines whether plants build the right mix, suppliers receive credible signals, warehouses hold useful inventory, and customers receive reliable commitments. Weak planning creates excess inventory in some places and shortages in others.",
    keyConcepts: [
      "Forecast accuracy, bias, and value-added review",
      "Demand sensing versus demand shaping",
      "S&OP or IBP as cross-functional decision governance",
      "Supply planning with capacity, material, labor, and supplier constraints",
      "Available-to-promise and allocation under constrained supply",
      "Exception management and escalation discipline",
    ],
    keyTerms: [
      { term: "Forecast error", definition: "The difference between forecasted demand and actual demand for a period." },
      { term: "Forecast bias", definition: "A repeated tendency for forecasts to be too high or too low." },
      { term: "S&OP", definition: "A recurring process that reconciles demand, supply, financial plans, and business priorities." },
      { term: "Demand shaping", definition: "Actions such as pricing, promotion, substitution, or allocation that influence demand timing or mix." },
      { term: "Available-to-promise", definition: "Uncommitted supply that can be promised to customers after existing commitments are considered." },
      { term: "Master production schedule", definition: "The detailed plan for what will be made, in what quantities, and when." },
    ],
    frameworks: [
      {
        title: "Planning exception logic",
        summary: "Use exceptions to focus attention where the plan needs a decision, not where normal variation exists.",
        steps: [
          "Identify the variance, constraint, or service risk.",
          "Determine whether it is demand-driven, supply-driven, data-driven, or policy-driven.",
          "Evaluate options such as reforecasting, capacity changes, allocation, substitution, or demand shaping.",
          "Escalate unresolved tradeoffs through S&OP governance with a clear recommendation.",
        ],
      },
      {
        title: "Forecast bias correction",
        summary: "Correct the cause of bias rather than repeatedly overriding numbers.",
        steps: [
          "Compare forecast, actual demand, and known events over several periods.",
          "Separate one-time spikes from repeatable pattern changes.",
          "Check commercial assumptions, promotion plans, lost sales, and channel mix.",
          "Update the planning assumption and monitor whether the bias improves.",
        ],
      },
    ],
    commonExamTraps: [
      "Changing the forecast immediately without diagnosing whether the variance is noise, bias, or a real market shift.",
      "Treating S&OP as an information-sharing meeting instead of a decision-making process.",
      "Expediting supply when demand shaping, allocation, or substitution better fits the business constraint.",
      "Ignoring capacity or material constraints when accepting a demand plan.",
    ],
    manufacturingExample: "If a constrained packaging line cannot support every promoted SKU, the right planning response is to align demand, supply, and commercial priorities. The answer is not simply to push the plant harder if the bottleneck is already loaded.",
    planningExample: "A forecast that is consistently 20 percent high for a product family should trigger bias review, not just more safety stock. The planner should inspect sales assumptions, event history, and demand signals before changing inventory policy.",
    logisticsOrSupplierExample: "A supplier that sees frequent schedule changes may protect itself with longer lead times or higher prices. Better planning stability and clear frozen zones can improve supplier reliability and inbound flow.",
    quickRecallPrompts: [
      "How do forecast error and forecast bias differ?",
      "When should a planner shape demand instead of chasing demand?",
      "What decision should S&OP make when demand exceeds supply?",
      "What makes a planning exception worth escalation?",
      "How does ATP protect customer commitments?",
    ],
    recommendedQuizFocus: [
      "Forecast bias and forecast error scenarios",
      "S&OP decision governance questions",
      "Demand shaping and allocation tradeoffs",
      "Capacity-constrained supply planning scenarios",
    ],
    plantManagerSummary: "A good plan protects the plant from surprise, churn, and impossible promises. It tells the plant what matters most, what demand is credible, where capacity is constrained, and which tradeoffs leadership has approved. Planning is not just numbers; it is the operating agreement between sales, supply, finance, and execution.",
    suggestedPracticeQuiz: {
      moduleId: "m2",
      length: 25,
      difficulty: "hard",
      mode: "study",
      label: "Module 2 planning pressure set",
    },
  },
  {
    moduleId: "m3",
    moduleName: "Global Network Design",
    overview: "Global network design determines where work is performed, where inventory is positioned, how flows move, and how the system responds to cost, service, tax, trade, and disruption pressure. The exam tests your ability to choose network structures that fit demand, product, risk, and service requirements.",
    whyItMatters: "Network decisions are expensive to reverse. A poor network can lock in long lead times, high freight cost, excess inventory, weak resilience, and poor regional service. Good leaders evaluate total system performance instead of choosing a facility or lane in isolation.",
    keyConcepts: [
      "Facility location and capacity strategy",
      "Centralized, decentralized, and hybrid distribution models",
      "Postponement, decoupling points, and delayed differentiation",
      "Inventory pooling versus local responsiveness",
      "Trade, tax, labor, geopolitical, and infrastructure considerations",
      "Resilience through redundancy, flexibility, and alternate flows",
    ],
    keyTerms: [
      { term: "Postponement", definition: "Delaying final configuration or commitment until better demand information is available." },
      { term: "Decoupling point", definition: "The point where activity shifts from forecast-driven to order-driven." },
      { term: "Inventory pooling", definition: "Using shared inventory to cover multiple demand streams and reduce total buffer needs." },
      { term: "Network optimization", definition: "Analysis of facilities, flows, costs, service, and constraints to compare network options." },
      { term: "Nearshoring", definition: "Moving production or sourcing closer to the demand market to reduce lead time or risk." },
      { term: "Total delivered cost", definition: "The full cost to deliver product through the network, including freight, duties, inventory, handling, and service effects." },
    ],
    frameworks: [
      {
        title: "Network design screen",
        summary: "Evaluate network options through business priorities, not only facility cost.",
        steps: [
          "Define demand geography, service promise, volume, variability, and product value density.",
          "Compare facility, transport, inventory, duty, tax, and handling impacts.",
          "Evaluate risk exposure, recovery options, and dependency concentration.",
          "Choose the structure that best balances service, cost, cash, and resilience.",
        ],
      },
      {
        title: "Postponement fit test",
        summary: "Postponement works when common upstream work can be separated from late-stage variety.",
        steps: [
          "Identify common components or process steps.",
          "Confirm that final differentiation can happen quickly and reliably near demand.",
          "Estimate inventory, obsolescence, and service benefits.",
          "Check whether downstream complexity or capacity risk offsets the benefit.",
        ],
      },
    ],
    commonExamTraps: [
      "Assuming centralization is always cheapest without considering freight, lead time, or service loss.",
      "Choosing postponement when the late-stage process is the actual bottleneck.",
      "Ignoring customs, trade policy, infrastructure, or geopolitical exposure in global decisions.",
      "Treating resilience as extra inventory only, instead of network flexibility and recovery design.",
    ],
    manufacturingExample: "A manufacturer may build common subassemblies in one efficient plant, then finish labeling, packaging, or configuration regionally. This reduces finished-goods variety while preserving market responsiveness.",
    planningExample: "A high-variability product family may benefit from pooled base inventory and regional finishing, while stable high-volume products may flow through a leaner direct replenishment model.",
    logisticsOrSupplierExample: "A global supplier in a disruption-prone region may require an alternate source, qualified backup lane, or regional buffer. The right network design considers recovery time, not just unit cost.",
    quickRecallPrompts: [
      "When does centralization help, and when does it hurt?",
      "What conditions make postponement a good strategy?",
      "How does a decoupling point change planning behavior?",
      "Which network risks are not visible in unit cost?",
      "Why might a hybrid network outperform a pure model?",
    ],
    recommendedQuizFocus: [
      "Postponement and decoupling point questions",
      "Centralization versus decentralization tradeoffs",
      "Global network cost and risk scenarios",
      "Resilience and alternate-flow questions",
    ],
    plantManagerSummary: "Network design decides what work the plant should do, what work should happen elsewhere, and how much flexibility the operation needs. The plant should not absorb every network weakness through overtime or expediting. A good network gives the plant a clear role, stable inputs, realistic lead times, and recovery options when disruption occurs.",
    suggestedPracticeQuiz: {
      moduleId: "m3",
      length: 25,
      difficulty: "hard",
      mode: "exam",
      label: "Module 3 network exam set",
    },
  },
  {
    moduleId: "m4",
    moduleName: "Sourcing and Supplier Management",
    overview: "Sourcing and supplier management covers how organizations select suppliers, structure commercial relationships, manage risk, and improve supplier performance over time. Exam questions often test whether you recognize total value and supply risk rather than defaulting to the lowest bid.",
    whyItMatters: "Supplier decisions shape cost, quality, lead time, innovation, compliance, and resilience. A sourcing decision that looks good on price can create plant downtime, quality escapes, premium freight, or customer service failures later.",
    keyConcepts: [
      "Supplier segmentation by business impact and supply risk",
      "Total cost of ownership and should-cost thinking",
      "Source selection using capability, quality, service, risk, and cost",
      "Supplier performance management and development",
      "Contract alignment with service, risk, incentives, and accountability",
      "Supplier collaboration, capacity visibility, and continuity planning",
    ],
    keyTerms: [
      { term: "Total cost of ownership", definition: "The complete cost of buying, receiving, using, supporting, and managing risk over the life of a purchase." },
      { term: "Should-cost analysis", definition: "An estimate of fair cost based on materials, labor, overhead, process, and market assumptions." },
      { term: "Supplier segmentation", definition: "Classifying suppliers so management effort matches risk and strategic importance." },
      { term: "Supplier development", definition: "Structured improvement work with a supplier to raise capability, quality, delivery, or cost performance." },
      { term: "Single sourcing", definition: "Using one supplier for a requirement, often for leverage or consistency, while accepting concentration risk." },
      { term: "Service-level agreement", definition: "A contract element that defines expected performance, measurement, and response expectations." },
    ],
    frameworks: [
      {
        title: "Supplier selection lens",
        summary: "Choose suppliers on fit, value, and risk, not price alone.",
        steps: [
          "Clarify the business need and consequence of supplier failure.",
          "Evaluate capability, capacity, quality systems, financial health, lead time, and risk exposure.",
          "Compare total cost of ownership rather than purchase price alone.",
          "Define governance, metrics, escalation, and improvement expectations before launch.",
        ],
      },
      {
        title: "Supplier relationship posture",
        summary: "Use different management intensity for strategic, bottleneck, leverage, and routine suppliers.",
        steps: [
          "Assess supply risk and business impact.",
          "Match relationship depth to the segment.",
          "Set the right review cadence, collaboration level, and contingency plan.",
          "Reassess the segment when demand, risk, or technology changes.",
        ],
      },
    ],
    commonExamTraps: [
      "Selecting the lowest price when quality, delivery, or continuity risk dominates the scenario.",
      "Using the same management approach for routine suppliers and strategic suppliers.",
      "Assuming penalties alone will fix supplier performance problems.",
      "Ignoring supplier capacity and financial health during source selection.",
    ],
    manufacturingExample: "A lower-price casting supplier may increase scrap, line stoppages, and inspection labor. The plant feels the real cost through downtime and rework, even if procurement records a purchase-price variance win.",
    planningExample: "For a constrained component, planners need supplier capacity visibility, firm horizons, and escalation rules. Releasing purchase orders late and then expediting is not a sourcing strategy.",
    logisticsOrSupplierExample: "A supplier with long ocean lead times may require earlier forecast sharing, alternate lanes, and defined incoterms. Supplier performance is tied to logistics design, not just production capability.",
    quickRecallPrompts: [
      "How is total cost of ownership broader than purchase price?",
      "When is single sourcing acceptable?",
      "What makes a supplier strategic rather than routine?",
      "When should supplier development be used instead of rebidding?",
      "Which contract terms protect service and continuity?",
    ],
    recommendedQuizFocus: [
      "Supplier segmentation scenarios",
      "TCO versus price questions",
      "Supplier performance and development questions",
      "Contract, risk, and continuity tradeoffs",
    ],
    plantManagerSummary: "A supplier decision is not finished when the price is negotiated. The plant needs reliable quality, stable lead times, realistic capacity, and fast issue resolution. Good sourcing protects production flow; poor sourcing pushes hidden cost into the factory.",
    suggestedPracticeQuiz: {
      moduleId: "m4",
      length: 25,
      difficulty: "medium",
      mode: "study",
      label: "Module 4 sourcing set",
    },
  },
  {
    moduleId: "m5",
    moduleName: "Inventory and Operations",
    overview: "Inventory and operations focuses on how materials, capacity, labor, equipment, and process flow create service outcomes. The exam expects you to distinguish inventory problems from capacity problems, bottleneck problems, quality problems, and policy problems.",
    whyItMatters: "Inventory is one of the most visible symptoms of operational health. Too little inventory creates service failures; too much hides process problems and consumes cash. Strong operations leaders use inventory, capacity, and flow decisions together.",
    keyConcepts: [
      "Safety stock, cycle stock, anticipation stock, and pipeline inventory",
      "Service level, fill rate, and stockout risk",
      "Capacity, utilization, throughput, and bottlenecks",
      "Constraint management and production flow",
      "Order quantities, reorder points, lead time, and variability",
      "Quality, setup, batch size, and scheduling effects on flow",
    ],
    keyTerms: [
      { term: "Safety stock", definition: "Extra inventory held to protect against uncertainty in demand, supply, or lead time." },
      { term: "Cycle stock", definition: "Inventory created by normal replenishment lot sizes between orders." },
      { term: "Reorder point", definition: "The inventory position that triggers replenishment." },
      { term: "Economic order quantity", definition: "A lot-size concept that balances ordering or setup cost against holding cost." },
      { term: "Bottleneck", definition: "The resource or process step that limits total system throughput." },
      { term: "Throughput", definition: "The rate at which the system produces saleable output or completes useful flow." },
    ],
    frameworks: [
      {
        title: "Inventory diagnosis",
        summary: "Determine why inventory is high or low before changing the policy.",
        steps: [
          "Identify whether the issue is demand variability, supplier lead time, forecast error, batch policy, or process instability.",
          "Check the target service level and business consequence of stockout.",
          "Adjust the policy that matches the root cause.",
          "Monitor service, turns, obsolescence, and expediting after the change.",
        ],
      },
      {
        title: "Constraint-first operations",
        summary: "Improve the part of the system that controls flow before optimizing nonconstraints.",
        steps: [
          "Find the real constraint using queues, utilization, and missed schedule signals.",
          "Exploit the constraint by protecting uptime, quality, and setup discipline.",
          "Subordinate other work to the constraint's pace.",
          "Elevate capacity only after current constraint performance is stabilized.",
        ],
      },
    ],
    commonExamTraps: [
      "Adding inventory to solve a bottleneck or quality problem.",
      "Confusing high utilization with good flow when queues and cycle time are growing.",
      "Treating safety stock and cycle stock as interchangeable.",
      "Ignoring lead-time variability when setting reorder points.",
    ],
    manufacturingExample: "If the paint booth is the bottleneck, building more upstream WIP does not raise output. The better move is to protect paint booth uptime, reduce changeover loss, improve first-pass quality, and schedule around the constraint.",
    planningExample: "A high-service spare part with unpredictable demand may need safety stock, while a stable high-volume part may need lot-size and reorder-point discipline. One inventory rule should not cover both.",
    logisticsOrSupplierExample: "If supplier lead time is unstable, safety stock may be justified in the short term, but supplier reliability, order frequency, and inbound visibility should be addressed so inventory does not become the permanent fix.",
    quickRecallPrompts: [
      "What problem does safety stock solve?",
      "What problem does cycle stock solve?",
      "How do you identify a true bottleneck?",
      "Why can high utilization damage service?",
      "When should inventory policy be segmented?",
    ],
    recommendedQuizFocus: [
      "Inventory type and policy questions",
      "Bottleneck and throughput scenarios",
      "Service level and reorder point logic",
      "Questions where inventory is a symptom, not the cause",
    ],
    plantManagerSummary: "Inventory should protect the customer, not hide broken flow. If the plant has a constraint, fix the constraint. If demand or lead time is variable, set buffers deliberately. If quality or setup is unstable, more inventory may only cover the problem while cost grows.",
    suggestedPracticeQuiz: {
      moduleId: "m5",
      length: 25,
      difficulty: "hard",
      mode: "study",
      label: "Module 5 operations pressure set",
    },
  },
  {
    moduleId: "m6",
    moduleName: "Logistics and Fulfillment",
    overview: "Logistics and fulfillment covers how product moves, is stored, is picked, is delivered, and sometimes returns. The exam tests tradeoffs among transportation mode, warehouse flow, order accuracy, delivery reliability, cost, and customer service.",
    whyItMatters: "The customer often experiences the supply chain through fulfillment. A good product and a good forecast still fail if orders ship late, arrive damaged, cost too much to deliver, or cannot be returned cleanly.",
    keyConcepts: [
      "Transportation mode selection and carrier performance",
      "Warehouse layout, slotting, picking, packing, and shipping flow",
      "Order fulfillment strategy and customer delivery promise",
      "Distribution network design and last-mile tradeoffs",
      "Reverse logistics, returns, repair, reuse, and disposition",
      "Perfect order performance and logistics visibility",
    ],
    keyTerms: [
      { term: "Mode selection", definition: "Choosing transportation based on speed, cost, reliability, handling need, and product characteristics." },
      { term: "Cross-docking", definition: "Moving inbound goods directly to outbound flow with little or no storage." },
      { term: "Slotting", definition: "Assigning warehouse locations to improve travel time, pick productivity, and accuracy." },
      { term: "Perfect order", definition: "An order delivered complete, on time, accurate, damage-free, and with correct documentation." },
      { term: "Reverse logistics", definition: "The process for returns, repair, recycling, refurbishment, disposal, or recovery." },
      { term: "Freight consolidation", definition: "Combining shipments to improve utilization and reduce transportation cost." },
    ],
    frameworks: [
      {
        title: "Mode selection screen",
        summary: "Choose transportation based on the total service requirement, not only freight rate.",
        steps: [
          "Clarify required delivery speed, reliability, and customer consequence of failure.",
          "Check product value, density, shelf life, fragility, and handling needs.",
          "Compare freight cost, inventory impact, damage risk, and variability.",
          "Select the mode that supports the service promise at acceptable total cost.",
        ],
      },
      {
        title: "Warehouse flow improvement",
        summary: "Improve flow by reducing travel, touches, waiting, and error opportunities.",
        steps: [
          "Identify fast movers, high-risk items, and exception paths.",
          "Review slotting, pick method, replenishment, staging, and dock flow.",
          "Remove unnecessary touches before adding labor or automation.",
          "Measure impact through accuracy, labor productivity, cycle time, and service.",
        ],
      },
    ],
    commonExamTraps: [
      "Choosing the fastest mode when stable demand and cost discipline are more important.",
      "Adding labor when warehouse layout, slotting, or batching is the real issue.",
      "Treating returns as a nuisance instead of a designed process with customer and recovery value.",
      "Looking only at freight rate while ignoring inventory, damage, reliability, and service consequences.",
    ],
    manufacturingExample: "A plant shipping bulky, low-value product may improve service and cost through better load building, staging discipline, and carrier appointments rather than premium freight.",
    planningExample: "If order waves overwhelm the warehouse at the same time every afternoon, planners may need to review cutoffs, batching, labor windows, and replenishment timing.",
    logisticsOrSupplierExample: "A supplier shipping small urgent lots every day may drive high inbound cost. Consolidated pickup schedules, milk runs, or different replenishment rules can reduce cost without hurting service.",
    quickRecallPrompts: [
      "What factors should drive transport mode selection?",
      "When does cross-docking make sense?",
      "Why can slotting outperform adding headcount?",
      "What does perfect order performance measure?",
      "How should returns be designed into fulfillment?",
    ],
    recommendedQuizFocus: [
      "Mode selection tradeoff questions",
      "Warehouse flow and slotting scenarios",
      "Perfect order and service metric questions",
      "Reverse logistics and returns questions",
    ],
    plantManagerSummary: "Fulfillment is where operating promises become visible to the customer. The plant and warehouse need a realistic shipping plan, clean staging, accurate documentation, and carriers that match the service need. Premium freight should not be the normal fix for poor flow.",
    suggestedPracticeQuiz: {
      moduleId: "m6",
      length: 25,
      difficulty: "medium",
      mode: "exam",
      label: "Module 6 logistics exam set",
    },
  },
  {
    moduleId: "m7",
    moduleName: "Risk, Resilience, and Compliance",
    overview: "Risk, resilience, and compliance focuses on identifying exposures, reducing likelihood or impact, preparing continuity responses, and maintaining control discipline. The exam favors proactive governance over heroic firefighting after a disruption occurs.",
    whyItMatters: "Disruptions can stop production, delay customers, trigger regulatory penalties, and damage trust. Supply chain leaders must know which risks matter most, who owns them, what controls exist, and how the organization will respond when conditions change.",
    keyConcepts: [
      "Risk identification, assessment, ownership, and mitigation",
      "Business continuity planning and recovery priorities",
      "Preventive, detective, and corrective controls",
      "Compliance with trade, safety, quality, ethical, and regulatory requirements",
      "Resilience through visibility, redundancy, flexibility, and response speed",
      "Scenario planning, risk monitoring, and escalation thresholds",
    ],
    keyTerms: [
      { term: "Risk register", definition: "A structured list of risks, impacts, likelihood, owners, mitigation actions, and status." },
      { term: "Business continuity plan", definition: "A documented plan for maintaining or restoring critical operations during disruption." },
      { term: "Mitigation", definition: "Action taken to reduce the likelihood or impact of a risk." },
      { term: "Control", definition: "A process or activity that prevents, detects, or corrects risk or compliance failures." },
      { term: "Recovery time objective", definition: "The target time within which a process or capability should be restored after disruption." },
      { term: "Compliance", definition: "Adherence to applicable laws, regulations, standards, policies, and contractual obligations." },
    ],
    frameworks: [
      {
        title: "Risk prioritization",
        summary: "Focus mitigation effort on the risks with the highest business consequence and practical likelihood.",
        steps: [
          "Define the risk event and exposed node, supplier, process, or lane.",
          "Estimate impact on safety, service, cost, compliance, and reputation.",
          "Assess likelihood, detectability, and time to recover.",
          "Assign owner, mitigation, contingency, trigger, and review cadence.",
        ],
      },
      {
        title: "Continuity response sequence",
        summary: "Respond in a disciplined order so teams protect critical outcomes first.",
        steps: [
          "Detect the event and classify severity.",
          "Activate escalation and decision rights.",
          "Stabilize customer, safety, compliance, and critical production flow.",
          "Recover capability, then update controls and lessons learned.",
        ],
      },
    ],
    commonExamTraps: [
      "Treating risk management as a one-time assessment instead of an ongoing governed process.",
      "Choosing extra inventory when the real gap is visibility, alternate supply, compliance control, or recovery planning.",
      "Waiting for a disruption before defining decision rights and escalation triggers.",
      "Confusing compliance documentation with actual operating control.",
    ],
    manufacturingExample: "A single-source component for a critical line needs more than a spreadsheet note. It may require dual qualification, tested alternate routings, buffer rules, supplier continuity evidence, and clear shutdown priorities.",
    planningExample: "If customs errors repeatedly delay inbound material, the better answer is process ownership, document controls, training, and audit checks, not permanent emergency freight.",
    logisticsOrSupplierExample: "A port strike risk may require alternate ports, preapproved carriers, earlier shipment release, or regional inventory. The plan should define triggers before the disruption blocks freight.",
    quickRecallPrompts: [
      "What makes a risk register actionable?",
      "How is resilience different from redundancy?",
      "When should a continuity plan be activated?",
      "What is the difference between preventive and detective controls?",
      "Why is compliance an operating process, not just documentation?",
    ],
    recommendedQuizFocus: [
      "Risk register and mitigation questions",
      "Continuity planning scenarios",
      "Compliance control questions",
      "Resilience versus inventory-buffer traps",
    ],
    plantManagerSummary: "Risk management is how the plant avoids being surprised by known vulnerabilities. Know the critical suppliers, lanes, equipment, compliance points, and decision triggers. A continuity plan should tell the plant what to protect first and who decides when normal flow breaks.",
    suggestedPracticeQuiz: {
      moduleId: "m7",
      length: 25,
      difficulty: "hard",
      mode: "study",
      label: "Module 7 resilience set",
    },
  },
  {
    moduleId: "m8",
    moduleName: "Technology and Continuous Improvement",
    overview: "Technology and continuous improvement covers the systems, data, analytics, process discipline, and change practices that help supply chains improve performance. The exam often tests whether you choose the right improvement method for the problem rather than chasing technology for its own sake.",
    whyItMatters: "Tools only create value when processes, data, ownership, and adoption are ready. A new dashboard, ERP setting, or automation project can make poor discipline faster instead of making the operation better.",
    keyConcepts: [
      "Process improvement based on root cause and measurable gaps",
      "ERP, planning systems, visibility tools, and analytics enablement",
      "Data governance, master data quality, and ownership",
      "Lean thinking, waste reduction, standard work, and problem solving",
      "Change management, adoption, training, and sustainment",
      "Sustainability, traceability, and responsible operating improvement",
    ],
    keyTerms: [
      { term: "Root cause analysis", definition: "A structured approach to finding the underlying cause of a recurring problem." },
      { term: "Data governance", definition: "Rules, ownership, standards, and controls that keep data reliable and usable." },
      { term: "Master data", definition: "Core reference data such as items, suppliers, routings, bills of material, lead times, and locations." },
      { term: "Kaizen", definition: "A continuous-improvement approach focused on frequent, practical process improvements." },
      { term: "ERP", definition: "An enterprise system that integrates transactions, planning, inventory, finance, and operational records." },
      { term: "Standard work", definition: "The agreed best current method for performing a task consistently and safely." },
    ],
    frameworks: [
      {
        title: "Improvement method selection",
        summary: "Start with the performance gap and root cause before selecting a tool or method.",
        steps: [
          "Define the problem, baseline, target, and customer or business impact.",
          "Map the current process and verify data accuracy.",
          "Use root-cause analysis to separate symptoms from causes.",
          "Apply the simplest effective improvement and monitor sustainment.",
        ],
      },
      {
        title: "Technology readiness check",
        summary: "Avoid automating unstable processes or unreliable data.",
        steps: [
          "Clarify the decision, visibility, or process gap the technology should solve.",
          "Confirm process ownership, data quality, and integration requirements.",
          "Check whether the tool changes the constraint or only adds reporting.",
          "Plan training, adoption, governance, and performance measurement.",
        ],
      },
    ],
    commonExamTraps: [
      "Choosing a new system when the real issue is poor data ownership or process discipline.",
      "Starting improvement work without a baseline, target, or root-cause evidence.",
      "Assuming automation improves performance without process redesign and adoption.",
      "Treating dashboards as control when no one owns the response process.",
    ],
    manufacturingExample: "Advanced scheduling software will not fix late orders if routings, setup times, scrap rates, and material availability data are unreliable. The plant must stabilize master data and process discipline first.",
    planningExample: "A planner seeing unstable KPI trends should verify definitions, master data, transaction timing, and process adherence before recommending a new analytics tool.",
    logisticsOrSupplierExample: "Supplier portals can improve visibility, but only if suppliers use them correctly, data fields are governed, and buyers act on exceptions. Technology must be paired with operating cadence.",
    quickRecallPrompts: [
      "When is technology the wrong answer?",
      "Why does data governance matter before analytics?",
      "What proves an improvement actually sustained?",
      "How does root cause analysis prevent shallow fixes?",
      "What must be true before automation creates value?",
    ],
    recommendedQuizFocus: [
      "Root-cause and continuous-improvement questions",
      "Technology fit and data governance scenarios",
      "ERP and master data questions",
      "Questions where automation is tempting but premature",
    ],
    plantManagerSummary: "Do not let a tool become the strategy. Fix the process, clean the data, define ownership, then use technology to make the better process easier to run. Continuous improvement should make daily work more stable, visible, and measurable.",
    suggestedPracticeQuiz: {
      moduleId: "m8",
      length: 25,
      difficulty: "medium",
      mode: "study",
      label: "Module 8 improvement set",
    },
  },
];

export function getModuleNote(moduleId: string) {
  return moduleNotes.find((note) => note.moduleId === moduleId) ?? null;
}
