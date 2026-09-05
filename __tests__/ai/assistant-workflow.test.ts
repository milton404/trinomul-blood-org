import { describe, expect, it } from "vitest";
import {
  advanceAssistantWorkflow,
  detectAssistantLanguage,
  type AssistantWorkflowState,
} from "@/lib/ai/assistant-workflow";

describe("assistant workflow", () => {
  it("continues eligibility with a numeric age answer", () => {
    const started = advanceAssistantWorkflow("আমি কি রক্ত দিতে পারি?", null);

    expect(started.state?.pendingField).toBe("age");

    const continued = advanceAssistantWorkflow("23", started.state);

    expect(continued.state?.values.age).toBe(23);
    expect(continued.state?.pendingField).toBe("weight");
    expect(continued.reply).toContain("ওজন");
  });

  it("starts a Bangla donor search for Banglish blood requests", () => {
    const result = advanceAssistantWorkflow("amar B+ rokto lagbe", null);

    expect(result.state?.flow).toBe("donor_search");
    expect(result.state?.values.bloodGroup).toBe("B+");
    expect(result.state?.pendingField).toBe("location");
    expect(result.reply).toContain("কোন এলাকায়");
  });

  it("uses Bangla replies for Banglish and English replies for English", () => {
    expect(detectAssistantLanguage("amar rokto lagbe")).toBe("bn");
    expect(detectAssistantLanguage("I need blood")).toBe("en");
  });

  it("keeps known donor-search criteria when a short location answer arrives", () => {
    const state: AssistantWorkflowState = {
      version: 1,
      flow: "donor_search",
      pendingField: "location",
      locale: "bn",
      values: { bloodGroup: "O+" },
    };

    const result = advanceAssistantWorkflow("Rangpur", state);

    expect(result.state?.values.bloodGroup).toBe("O+");
    expect(result.state?.values.location).toBe("Rangpur");
    expect(result.shouldSearchDonors).toBe(true);
  });

  it("rejects a non-numeric age and keeps asking", () => {
    const state: AssistantWorkflowState = {
      version: 1,
      flow: "eligibility",
      pendingField: "age",
      locale: "en",
      values: {},
    };

    const result = advanceAssistantWorkflow("twenty three", state);

    expect(result.state?.pendingField).toBe("age");
    expect(result.state?.values.age).toBeUndefined();
  });

  it("rejects an out-of-range weight and keeps asking", () => {
    const state: AssistantWorkflowState = {
      version: 1,
      flow: "eligibility",
      pendingField: "weight",
      locale: "en",
      values: { age: 25 },
    };

    const result = advanceAssistantWorkflow("0", state);

    expect(result.state?.pendingField).toBe("weight");
    expect(result.state?.values.weight).toBeUndefined();
  });

  it("accepts an unknown blood group answer by re-asking", () => {
    const state: AssistantWorkflowState = {
      version: 1,
      flow: "donor_search",
      pendingField: "bloodGroup",
      locale: "en",
      values: {},
    };

    const result = advanceAssistantWorkflow("negative", state);

    expect(result.state?.pendingField).toBe("bloodGroup");
    expect(result.state?.values.bloodGroup).toBeUndefined();
  });

  it("accepts a Bangla blood group word answer in donor search", () => {
    const state: AssistantWorkflowState = {
      version: 1,
      flow: "donor_search",
      pendingField: "bloodGroup",
      locale: "bn",
      values: {},
    };

    const result = advanceAssistantWorkflow("বি প্লাস", state);

    expect(result.state?.values.bloodGroup).toBe("B+");
    expect(result.state?.pendingField).toBe("location");
  });

  it("accepts a Bangla negative blood group word answer in donor search", () => {
    const state: AssistantWorkflowState = {
      version: 1,
      flow: "donor_search",
      pendingField: "bloodGroup",
      locale: "bn",
      values: {},
    };

    const result = advanceAssistantWorkflow("ও নেগেটিভ", state);

    expect(result.state?.values.bloodGroup).toBe("O-");
    expect(result.state?.pendingField).toBe("location");
  });

  it("accepts Bangla AB blood group word answers in donor search", () => {
    const state: AssistantWorkflowState = {
      version: 1,
      flow: "donor_search",
      pendingField: "bloodGroup",
      locale: "bn",
      values: {},
    };

    const result = advanceAssistantWorkflow("এবি প্লাস", state);

    expect(result.state?.values.bloodGroup).toBe("AB+");
    expect(result.state?.pendingField).toBe("location");
  });

  it("accepts Banglish blood group pronunciations in donor search", () => {
    const state: AssistantWorkflowState = {
      version: 1,
      flow: "donor_search",
      pendingField: "bloodGroup",
      locale: "bn",
      values: {},
    };

    const result = advanceAssistantWorkflow("bi plus", state);

    expect(result.state?.values.bloodGroup).toBe("B+");
    expect(result.state?.pendingField).toBe("location");
  });

  it("accepts 'b positive' as a blood group answer", () => {
    const state: AssistantWorkflowState = {
      version: 1,
      flow: "donor_search",
      pendingField: "bloodGroup",
      locale: "en",
      values: {},
    };

    const result = advanceAssistantWorkflow("b positive", state);

    expect(result.state?.values.bloodGroup).toBe("B+");
    expect(result.state?.pendingField).toBe("location");
  });

  it("accepts 'যেকোনো' (any) as a donor search blood group answer", () => {
    const state: AssistantWorkflowState = {
      version: 1,
      flow: "donor_search",
      pendingField: "bloodGroup",
      locale: "bn",
      values: {},
    };

    const result = advanceAssistantWorkflow("যেকোনো", state);

    expect(result.state?.values.bloodGroup).toBe("ANY");
    expect(result.state?.pendingField).toBe("location");
  });

  it("accepts English 'any' as a donor search blood group answer", () => {
    const state: AssistantWorkflowState = {
      version: 1,
      flow: "donor_search",
      pendingField: "bloodGroup",
      locale: "en",
      values: {},
    };

    const result = advanceAssistantWorkflow("any", state);

    expect(result.state?.values.bloodGroup).toBe("ANY");
    expect(result.state?.pendingField).toBe("location");
  });

  it("skips the blood group question when the first message says any group", () => {
    const result = advanceAssistantWorkflow(
      "আমার রংপুর সদরের মধ্যে একজন রক্তদাতা লাগবে, যেকোনো গ্রুপ",
      null,
    );

    expect(result.state?.flow).toBe("donor_search");
    expect(result.state?.values.bloodGroup).toBe("ANY");
    expect(result.state?.pendingField).toBe("location");
  });

  it("accepts a Bangla blood group word answer in request guidance", () => {
    const state: AssistantWorkflowState = {
      version: 1,
      flow: "request_guidance",
      pendingField: "bloodGroup",
      locale: "bn",
      values: {},
    };

    const result = advanceAssistantWorkflow("বি প্লাস", state);

    expect(result.state?.values.bloodGroup).toBe("B+");
    expect(result.state?.pendingField).toBe("location");
  });

  it("completes a tracking request when a valid code arrives", () => {
    const state: AssistantWorkflowState = {
      version: 1,
      flow: "track_request",
      pendingField: "trackingCode",
      locale: "en",
      values: {},
    };

    const result = advanceAssistantWorkflow("REQ-ABC123", state);

    expect(result.shouldTrackRequest).toBe(true);
    expect(result.state?.pendingField).toBe("trackingCode");
  });

  it("rejects an invalid tracking code and keeps asking", () => {
    const state: AssistantWorkflowState = {
      version: 1,
      flow: "track_request",
      pendingField: "trackingCode",
      locale: "en",
      values: {},
    };

    const result = advanceAssistantWorkflow("hello", state);

    expect(result.state?.pendingField).toBe("trackingCode");
    expect(result.shouldTrackRequest).toBeUndefined();
  });

  it("runs the full eligibility flow to a final result", () => {
    let state: AssistantWorkflowState | null = null;

    state = advanceAssistantWorkflow("Can I donate blood?", null).state;
    state = advanceAssistantWorkflow("25", state).state;
    state = advanceAssistantWorkflow("65 kg", state).state;
    state = advanceAssistantWorkflow("no", state).state;

    const result = advanceAssistantWorkflow("no", state);

    expect(result.state).toBeNull();
    expect(result.reply).toContain("eligible");
  });

  it("flags eligibility candidates under 18 as ineligible", () => {
    let state: AssistantWorkflowState | null = null;

    state = advanceAssistantWorkflow("Can I donate blood?", null).state;
    state = advanceAssistantWorkflow("16", state).state;

    expect(state?.values.age).toBe(16);
    expect(state?.pendingField).toBe("weight");
  });

  it("uses English replies for English messages", () => {
    const started = advanceAssistantWorkflow("I need A+ blood", null);

    expect(started.state?.locale).toBe("en");
    expect(started.reply).toContain("area");
  });

  it("starts a request guidance flow for explicit request intent", () => {
    const started = advanceAssistantWorkflow("I want to make a blood request", null);

    expect(started.state?.flow).toBe("request_guidance");
    expect(started.state?.pendingField).toBe("bloodGroup");
  });

  it("starts a Bangla request guidance flow for রিকোয়েস্ট", () => {
    const started = advanceAssistantWorkflow("আমি রক্তের রিকোয়েস্ট করতে চাই", null);

    expect(started.state?.flow).toBe("request_guidance");
    expect(started.state?.pendingField).toBe("bloodGroup");
    expect(started.reply).toContain("গ্রুপ");
  });

  it("guides through blood group, location, units, and urgency", () => {
    let state: AssistantWorkflowState | null = null;

    state = advanceAssistantWorkflow("I want to make a blood request", null).state;
    state = advanceAssistantWorkflow("B+", state).state;
    expect(state?.pendingField).toBe("location");

    state = advanceAssistantWorkflow("Rangpur", state).state;
    expect(state?.values.location).toBe("Rangpur");
    expect(state?.pendingField).toBe("units");

    state = advanceAssistantWorkflow("2 units", state).state;
    expect(state?.values.units).toBe(2);
    expect(state?.pendingField).toBe("urgency");

    const result = advanceAssistantWorkflow("urgent", state);

    expect(result.state).toBeNull();
    expect(result.reply).toContain("B+");
    expect(result.reply).toContain("/request");
    expect(result.reply).toContain("cannot");
  });

  it("does not start a donor search for how-to-become-a-donor questions in Banglish", () => {
    const result = advanceAssistantWorkflow("kivabe a blood donar hobo", null);

    expect(result.state).toBeNull();
    expect(result.reply).not.toContain("Which blood group donor");
    expect(result.reply).toContain("রক্তদাতা");
  });

  it("answers how to become a donor instead of searching for donors", () => {
    const result = advanceAssistantWorkflow("how do I become a blood donor", null);

    expect(result.state).toBeNull();
    expect(result.reply).toContain("become a blood donor");
    expect(result.reply).not.toContain("Which blood group donor");
  });

  it("answers Bangla how-to-become-a-donor questions", () => {
    const result = advanceAssistantWorkflow("আমি রক্তদাতা হতে চাই", null);

    expect(result.state).toBeNull();
    expect(result.reply).toContain("রক্তদাতা");
  });

  it("still starts a donor search when the user wants to find a donor", () => {
    const result = advanceAssistantWorkflow("kivabe B+ donor pabo", null);

    expect(result.state?.flow).toBe("donor_search");
    expect(result.state?.values.bloodGroup).toBe("B+");
  });
});
