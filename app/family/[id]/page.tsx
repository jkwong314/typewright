'use client'

export default function FamilyEditorPage({ params }: { params: { id: string } }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Family Editor</h1>
      <p className="text-gray-500 mt-1 text-sm">Family: {params.id}</p>
    </div>
  )
}
