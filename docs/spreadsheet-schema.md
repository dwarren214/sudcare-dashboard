Here's your spreadsheet schema converted to markdown:

# Spreadsheet Schema

| Column Name | Data Type | Description | Data Handling Notes |
|------------|-----------|-------------|-------------------|
| **message_id** | int | An ID that identifies the user message of a chatbot transcript. | |
| **message_date** | date | The date that a user message was submitted. | Format: mm/dd/yyyy. Input data may shorten month or day value to single digit if value < 10. Ingestion script will need to account for this. |
| **message_time** | numeric | Excel time fraction representing when the user message was submitted. | Values range from 0 (midnight) to <1, following Excel’s fractional-day storage. Ingestion will convert to timestamps; string times such as `hh:mm:ss AM/PM` will be coerced if encountered. |
| **day** | txt | The day of the week a message was submitted on. | Day's name (e.g. Sunday, Tuesday, etc.). |
| **participant_name** | txt | Participant ID. | Format: e.g. p266 |
| **category** | txt | One of five possible categories that describe the theme that the user's message is most applicable to. | |
| **other_label** | txt | For messages categorized by the label 'other', a subcategory is determined and labeled in this column. | For messages that were not labeled as other, they will have a 'n/a' designation in this field. |
| **category_justification** | txt | LLM coded justification for a categorization decision based on the user's input message. | |
| **satisfied** | boolean | TRUE/FALSE value that has been LLM coded. | Determines whether a chatbot response sufficiently satisfied the user's message. Did the chatbot provide the user with the information they were seeking? Tracked as a proxy for 'how often did a user's message hit a safety/project guardrail, which would have prevented the chatbot to respond as requested?' |
| **satisfaction_justification** | txt | LLM coded justification for the TRUE/FALSE value for the satisfied metric. | |
| **registration_date** | date | The date of the user's first message, as well as the first day of their 12-week study period. | Format: mm/dd/yyyy. Input data may shorten month or day value to single digit if value < 10. Ingestion script will need to account for this. |
| **study_week** | int | Which of the 12 study weeks a message was submitted during. | Value between 1-12 |
| **response_latency** | float | The time required for a chatbot response to a user submitted message. | Described in seconds with two decimal places (e.g. 15.41) |
| **emergency_response** | boolean | Determination of whether the user input message triggered an emergency response/safety message from the chatbot. | Yes/No. Used to understand how often study participants signaled explicit distress in their messages. |
| **input_cost** | float | The cost in USD of the user's input message. | Format: e.g. 0.049546 |
| **output_cost** | float | The cost in USD of the chatbot response. | Format: e.g. 0.049546 |
| **total_cost** | float | The sum in USD of the input_cost + output_cost. | |
